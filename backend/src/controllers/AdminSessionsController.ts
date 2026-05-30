// src/controllers/AdminSessionsController.ts
// Controller for managing user sessions (admin panel)

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { RefreshToken } from '../entities/RefreshToken';
import { UserSessionLog } from '../entities/UserSessionLog';
import { User } from '../entities/User';
import { decodeToken } from '../config/jwt';

// Helper function to get client IP
const getClientIP = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

// Helper function to log security events (audit)
const logAdminSecurityEvent = async (
  eventType: string,
  userId: number | null,
  ipAddress: string | null,
  details: Record<string, unknown>
): Promise<void> => {
  try {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    const tableExists = await queryRunner.hasTable('audit_logs');
    if (tableExists) {
      await queryRunner.query(
        `INSERT INTO audit_logs (event_type, user_id, ip_address, details, created_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [eventType, userId, ipAddress, JSON.stringify(details)]
      );
    } else {
      console.info(`[AUDIT] ${eventType}:`, { userId, ipAddress, details });
    }
    await queryRunner.release();
  } catch {
    // TODO: implement persistent audit logging if audit_logs table is added
    console.info(`[AUDIT] ${eventType}:`, { userId, ipAddress, details });
  }
};

export class AdminSessionsController {
  /**
   * GET /api/admin/sessions
   * Zwraca listę wszystkich aktywnych sesji z danymi użytkowników
   */
  static async getAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
      const sessionLogRepo = AppDataSource.getRepository(UserSessionLog);

      // Pobierz aktywne tokeny z danymi użytkowników
      const now = new Date();
      const activeSessions = await refreshTokenRepo
        .createQueryBuilder('rt')
        .leftJoinAndSelect('rt.user', 'user')
        .leftJoinAndSelect('user.role', 'role')
        .where('rt.revoked = :revoked', { revoked: false })
        .andWhere('rt.expiresAt > :now', { now })
        .orderBy('rt.createdAt', 'DESC')
        .getMany();

      // Pobierz rzeczywisty loginAt z session_log dla każdego aktywnego tokenu
      const activeTokenIds = activeSessions.map(session => session.tokenId);
      const sessionLogsMap = new Map<string, UserSessionLog>();
      if (activeTokenIds.length > 0) {
        const logs = await sessionLogRepo
          .createQueryBuilder('sl')
          .where('sl.tokenId IN (:...tokenIds)', { tokenIds: activeTokenIds })
          .getMany();
        for (const log of logs || []) {
          sessionLogsMap.set(log.tokenId, log);
        }
      }

      // Pobierz sumę czasu sesji dla każdego userId
      const totalTimesRaw = await sessionLogRepo
        .createQueryBuilder('sl')
        .select('sl.userId', 'userId')
        .addSelect('SUM(sl.durationSeconds)', 'totalSeconds')
        .where('sl.durationSeconds IS NOT NULL')
        .groupBy('sl.userId')
        .getRawMany();

      const totalTimeMap = new Map<number, number>();
      for (const row of totalTimesRaw) {
        totalTimeMap.set(Number(row.userId), Number(row.totalSeconds) || 0);
      }

      // Odczytaj tokenId wywołującego admina z tokenu dostępu
      let currentAdminTokenId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const accessToken = authHeader.substring(7);
        const decoded = decodeToken(accessToken);
        currentAdminTokenId = decoded?.jti;
      }

      const result = activeSessions.map(session => {
        const sessionLog = sessionLogsMap.get(session.tokenId);
        const realLoginAt = sessionLog?.loginAt || session.createdAt;
        const currentSessionSeconds = Math.floor((now.getTime() - realLoginAt.getTime()) / 1000);
        const totalSessionTimeSeconds = totalTimeMap.get(session.userId) || 0;

        return {
          tokenId: session.tokenId,
          userId: session.userId,
          username: session.user?.username || '',
          firstName: session.user?.firstName || '',
          lastName: session.user?.lastName || '',
          role: session.user?.role?.name || '',
          email: session.user?.email || '',
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          currentIpAddress: sessionLog?.lastIpAddress || session.ipAddress,
          currentUserAgent: sessionLog?.lastUserAgent || session.userAgent,
          ipChanged: !!(sessionLog?.lastIpAddress && sessionLog.lastIpAddress !== sessionLog.ipAddress),
          uaChanged: !!(sessionLog?.lastUserAgent && sessionLog.lastUserAgent !== sessionLog.userAgent),
          loginAt: realLoginAt,
          expiresAt: session.expiresAt,
          currentSessionSeconds,
          totalSessionTimeSeconds,
          lastLogin: session.user?.lastLogin || null,
          isCurrentSession: session.tokenId === currentAdminTokenId,
        };
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Błąd pobierania sesji:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas pobierania sesji',
      });
    }
  }

  /**
   * DELETE /api/admin/sessions/:tokenId
   * Ręczne wylogowanie sesji przez admina (revoke tokenu + zapis w session_log)
   */
  static async forceLogout(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId } = req.params;

      const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
      const tokenRecord = await refreshTokenRepo.findOne({ where: { tokenId } });

      if (!tokenRecord) {
        res.status(404).json({
          success: false,
          message: 'Sesja nie istnieje',
        });
        return;
      }

      if (tokenRecord.revoked) {
        res.status(404).json({
          success: false,
          message: 'Sesja już została zakończona',
        });
        return;
      }

      // Revoke tokenu
      tokenRecord.revoked = true;
      tokenRecord.revokedAt = new Date();
      await refreshTokenRepo.save(tokenRecord);

      // Uzupełnij log sesji
      const sessionLogRepo = AppDataSource.getRepository(UserSessionLog);
      const sessionLog = await sessionLogRepo.findOne({ where: { tokenId } });
      if (sessionLog && !sessionLog.logoutAt) {
        sessionLog.logoutAt = new Date();
        sessionLog.durationSeconds = Math.floor((sessionLog.logoutAt.getTime() - sessionLog.loginAt.getTime()) / 1000);
        sessionLog.logoutType = 'admin_forced';
        await sessionLogRepo.save(sessionLog);
      }

      // Zaloguj zdarzenie w audit_logs
      const adminUserId = req.userId || null;
      const ipAddress = getClientIP(req);
      await logAdminSecurityEvent('ADMIN_FORCE_LOGOUT', adminUserId, ipAddress, {
        targetTokenId: tokenId,
        targetUserId: tokenRecord.userId,
      });

      res.json({
        success: true,
        message: 'Sesja zakończona',
        data: { tokenId, userId: tokenRecord.userId },
      });
    } catch (error) {
      console.error('Błąd wymuszania wylogowania:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas wylogowania',
      });
    }
  }

  /**
   * GET /api/admin/sessions/history
   * Historia wszystkich sesji (zakończonych i aktywnych) pogrupowana per użytkownik
   */
  static async getSessionHistory(req: Request, res: Response): Promise<void> {
    try {
      const sessionLogRepo = AppDataSource.getRepository(UserSessionLog);
      const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);

      // Pobierz wszystkie logi sesji z danymi użytkowników
      const allLogs = await sessionLogRepo
        .createQueryBuilder('sl')
        .leftJoinAndSelect('sl.user', 'user')
        .leftJoinAndSelect('user.role', 'role')
        .orderBy('sl.loginAt', 'DESC')
        .getMany();

      // Pobierz aktywne tokenId żeby oznaczyć aktywne sesje
      const now = new Date();
      const activeTokenIds = new Set<string>();
      const activeTokens = await refreshTokenRepo
        .createQueryBuilder('rt')
        .select('rt.tokenId')
        .where('rt.revoked = :revoked', { revoked: false })
        .andWhere('rt.expiresAt > :now', { now })
        .getMany();
      for (const token of activeTokens) {
        activeTokenIds.add(token.tokenId);
      }

      // Pogrupuj per userId
      const usersMap = new Map<number, {
        userId: number;
        username: string;
        firstName: string;
        lastName: string;
        role: string;
        email: string;
        totalDurationSeconds: number;
        sessionCount: number;
        lastActiveAt: Date | null;
        isCurrentlyActive: boolean;
        sessions: object[];
      }>();

      for (const log of allLogs) {
        if (!log.user) continue;

        const isActive = activeTokenIds.has(log.tokenId);
        const sessionDuration = log.durationSeconds ??
          (isActive ? Math.floor((now.getTime() - log.loginAt.getTime()) / 1000) : null);

        if (!usersMap.has(log.userId)) {
          usersMap.set(log.userId, {
            userId: log.userId,
            username: log.user.username,
            firstName: log.user.firstName,
            lastName: log.user.lastName,
            role: log.user.role?.name || '',
            email: log.user.email,
            totalDurationSeconds: 0,
            sessionCount: 0,
            lastActiveAt: null,
            isCurrentlyActive: false,
            sessions: [],
          });
        }

        const userEntry = usersMap.get(log.userId)!;
        userEntry.sessionCount++;
        if (sessionDuration !== null) {
          userEntry.totalDurationSeconds += sessionDuration;
        }
        if (isActive) {
          userEntry.isCurrentlyActive = true;
        }
        if (!userEntry.lastActiveAt || log.loginAt > userEntry.lastActiveAt) {
          userEntry.lastActiveAt = log.loginAt;
        }

        const ipChanged = !!(log.lastIpAddress && log.lastIpAddress !== log.ipAddress);
        const uaChanged = !!(log.lastUserAgent && log.lastUserAgent !== log.userAgent);

        userEntry.sessions.push({
          id: log.id,
          loginAt: log.loginAt,
          logoutAt: log.logoutAt,
          durationSeconds: sessionDuration,
          loginIpAddress: log.ipAddress,
          currentIpAddress: log.lastIpAddress || log.ipAddress,
          loginUserAgent: log.userAgent,
          currentUserAgent: log.lastUserAgent || log.userAgent,
          ipChanged,
          uaChanged,
          logoutType: log.logoutType,
          isActive,
        });
      }

      const result = Array.from(usersMap.values())
        .sort((a, b) => {
          if (!a.lastActiveAt) return 1;
          if (!b.lastActiveAt) return -1;
          return b.lastActiveAt.getTime() - a.lastActiveAt.getTime();
        });

      res.json({ success: true, data: { users: result } });
    } catch (error) {
      console.error('Błąd pobierania historii sesji:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera podczas pobierania historii' });
    }
  }

  /**
   * GET /api/admin/sessions/stats
   * Statystyki sesji
   */
  static async getSessionStats(req: Request, res: Response): Promise<void> {
    try {
      const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
      const sessionLogRepo = AppDataSource.getRepository(UserSessionLog);
      const userRepo = AppDataSource.getRepository(User);

      const now = new Date();

      // Aktywne sesje
      const activeSessions = await refreshTokenRepo
        .createQueryBuilder('rt')
        .where('rt.revoked = :revoked', { revoked: false })
        .andWhere('rt.expiresAt > :now', { now })
        .getCount();

      // Unikalnych userId, które logowały się dziś
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const loggedTodayRaw = await sessionLogRepo
        .createQueryBuilder('sl')
        .select('COUNT(DISTINCT sl.userId)', 'count')
        .where('sl.loginAt >= :todayStart', { todayStart })
        .getRawOne();

      const loggedTodayCount = Number(loggedTodayRaw?.count) || 0;

      // Wszyscy aktywni użytkownicy
      const totalUsersCount = await userRepo
        .createQueryBuilder('u')
        .where('u.active = :active', { active: true })
        .getCount();

      // Średni czas sesji (ostatnie 7 dni)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const avgSecondsRaw = await sessionLogRepo
        .createQueryBuilder('sl')
        .select('AVG(sl.durationSeconds)', 'avg')
        .where('sl.loginAt >= :sevenDaysAgo', { sevenDaysAgo })
        .andWhere('sl.durationSeconds IS NOT NULL')
        .getRawOne();

      const avgSessionMinutes = Math.round((Number(avgSecondsRaw?.avg) || 0) / 60);

      res.json({
        success: true,
        data: {
          activeSessions,
          loggedTodayCount,
          totalUsersCount,
          avgSessionMinutes,
        },
      });
    } catch (error) {
      console.error('Błąd pobierania statystyk sesji:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas pobierania statystyk',
      });
    }
  }
}

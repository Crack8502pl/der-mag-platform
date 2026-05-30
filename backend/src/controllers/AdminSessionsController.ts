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
        const currentSessionSeconds = Math.floor((now.getTime() - session.createdAt.getTime()) / 1000);
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
          loginAt: session.createdAt,
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

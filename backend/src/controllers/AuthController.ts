// src/controllers/AuthController.ts
// Kontroler uwierzytelniania z obsługą rotacji tokenów

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, decodeToken } from '../config/jwt';
import { v4 as uuidv4 } from 'uuid';
import EmailService from '../services/EmailService';
import { PasswordChangedEmailContext } from '../types/EmailTypes';
import { generateRandomPassword } from '../utils/password';
import { NotificationService } from '../services/NotificationService';

// Helper function to log security events
const logSecurityEvent = async (
  eventType: string,
  userId: number | null,
  ipAddress: string | null,
  details: any
): Promise<void> => {
  try {
    // Try to insert into audit_logs if table exists
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    
    const tableExists = await queryRunner.hasTable('audit_logs');
    
    if (tableExists) {
      await queryRunner.query(
        `INSERT INTO audit_logs (event_type, user_id, ip_address, details, created_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [eventType, userId, ipAddress, JSON.stringify(details)]
      );
    }
    
    await queryRunner.release();
  } catch (error) {
    // Fallback to console if audit table doesn't exist
    console.error(`[SECURITY EVENT] ${eventType}:`, {
      userId,
      ipAddress,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

// Helper function to get client IP
const getClientIP = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

export class AuthController {
  /**
   * POST /api/auth/login
   * Logowanie użytkownika z generowaniem tokenów rotacyjnych
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      
      // Pobierz użytkownika z hasłem (bez sprawdzania active)
      const user = await userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .leftJoinAndSelect('user.role', 'role')
        .where('user.username = :username', { username })
        .getOne();

      // Sprawdź czy użytkownik istnieje
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'Konto nie istnieje'
        });
        return;
      }

      // Sprawdź czy użytkownik jest aktywny
      if (!user.active) {
        res.status(403).json({
          success: false,
          error: 'ACCOUNT_BLOCKED',
          message: 'Twoje konto zostało zablokowane'
        });
        return;
      }

      // Weryfikuj hasło
      const isPasswordValid = await user.validatePassword(password);

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'INVALID_PASSWORD',
          message: 'Błędne hasło'
        });
        return;
      }

      // Generate unique token ID
      const tokenId = uuidv4();
      const ipAddress = getClientIP(req);
      const userAgent = req.headers['user-agent'] || null;

      // Generuj tokeny z tokenId
      const payload = {
        userId: user.id,
        username: user.username,
        role: user.role.name
      };

      const accessToken = generateAccessToken(payload, tokenId);
      const refreshToken = generateRefreshToken(payload, tokenId);

      // Calculate expiration date for refresh token
      const refreshExpiresIn = process.env.REFRESH_EXPIRES || '7d';
      const expiresAt = new Date();
      
      // Parse expiration time
      const match = refreshExpiresIn.match(/^(\d+)([dhms])$/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
          case 'd': expiresAt.setDate(expiresAt.getDate() + value); break;
          case 'h': expiresAt.setHours(expiresAt.getHours() + value); break;
          case 'm': expiresAt.setMinutes(expiresAt.getMinutes() + value); break;
          case 's': expiresAt.setSeconds(expiresAt.getSeconds() + value); break;
        }
      } else {
        // Default 7 days
        expiresAt.setDate(expiresAt.getDate() + 7);
      }

      // Save refresh token to database
      const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
      const refreshTokenRecord = refreshTokenRepo.create({
        tokenId,
        userId: user.id,
        expiresAt,
        ipAddress,
        userAgent,
        deviceFingerprint: null
      });

      await refreshTokenRepo.save(refreshTokenRecord);

      // Aktualizuj ostatnie logowanie
      user.lastLogin = new Date();
      await userRepository.save(user);

      res.json({
        success: true,
        message: 'Zalogowano pomyślnie',
        data: {
          accessToken,
          refreshToken,
          requirePasswordChange: user.forcePasswordChange,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role.name
          }
        }
      });
    } catch (error) {
      console.error('Błąd logowania:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas logowania'
      });
    }
  }

  /**
   * POST /api/auth/refresh
   * Odświeżenie tokenu dostępu z rotacją refresh tokenu
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Brak refresh token'
        });
        return;
      }

      try {
        // Verify the refresh token
        const decoded = verifyRefreshToken(refreshToken);
        
        if (!decoded.jti) {
          res.status(401).json({
            success: false,
            message: 'Token nie zawiera identyfikatora (jti)'
          });
          return;
        }

        const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);

        // Check if table exists
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        const tableExists = await queryRunner.hasTable('refresh_tokens');
        await queryRunner.release();

        if (!tableExists) {
          res.status(503).json({
            success: false,
            message: 'System rotacji tokenów nie jest skonfigurowany. Uruchom migrację bazy danych.',
            code: 'MIGRATION_REQUIRED'
          });
          return;
        }

        // Find the token in database
        const tokenRecord = await refreshTokenRepo.findOne({
          where: { tokenId: decoded.jti }
        });

        // TOKEN REUSE DETECTION
        if (!tokenRecord || tokenRecord.revoked) {
          // Token reuse detected! Revoke all user's tokens
          await refreshTokenRepo.update(
            { userId: decoded.userId, revoked: false },
            { revoked: true, revokedAt: new Date() }
          );

          const ipAddress = getClientIP(req);
          await logSecurityEvent(
            'TOKEN_REUSE_ATTACK',
            decoded.userId,
            ipAddress,
            {
              attemptedTokenId: decoded.jti,
              revokedAllTokens: true,
              userAgent: req.headers['user-agent']
            }
          );

          res.status(401).json({
            success: false,
            message: 'Wykryto próbę ponownego użycia tokenu. Wszystkie sesje zostały unieważnione.',
            code: 'TOKEN_REUSE_ATTACK'
          });
          return;
        }

        // Check if token is expired
        if (tokenRecord.expiresAt < new Date()) {
          res.status(401).json({
            success: false,
            message: 'Refresh token wygasł'
          });
          return;
        }

        // Generate new tokens
        const newTokenId = uuidv4();
        const ipAddress = getClientIP(req);
        const userAgent = req.headers['user-agent'] || null;

        const payload = {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role
        };

        const newAccessToken = generateAccessToken(payload, newTokenId);
        const newRefreshToken = generateRefreshToken(payload, newTokenId);

        // Calculate new expiration
        const refreshExpiresIn = process.env.REFRESH_EXPIRES || '7d';
        const expiresAt = new Date();
        const match = refreshExpiresIn.match(/^(\d+)([dhms])$/);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2];
          switch (unit) {
            case 'd': expiresAt.setDate(expiresAt.getDate() + value); break;
            case 'h': expiresAt.setHours(expiresAt.getHours() + value); break;
            case 'm': expiresAt.setMinutes(expiresAt.getMinutes() + value); break;
            case 's': expiresAt.setSeconds(expiresAt.getSeconds() + value); break;
          }
        } else {
          expiresAt.setDate(expiresAt.getDate() + 7);
        }

        // Revoke old token
        tokenRecord.revoked = true;
        tokenRecord.revokedAt = new Date();
        tokenRecord.revokedByTokenId = newTokenId;
        await refreshTokenRepo.save(tokenRecord);

        // Create new token record
        const newTokenRecord = refreshTokenRepo.create({
          tokenId: newTokenId,
          userId: decoded.userId,
          expiresAt,
          ipAddress,
          userAgent,
          deviceFingerprint: null
        });
        await refreshTokenRepo.save(newTokenRecord);

        res.json({
          success: true,
          data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
          }
        });
      } catch (error: any) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
          res.status(401).json({
            success: false,
            message: 'Nieprawidłowy lub wygasły refresh token'
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Błąd odświeżania tokenu:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas odświeżania tokenu'
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Wylogowanie użytkownika (unieważnienie tokenu)
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const authHeader = req.headers.authorization;

      let tokenId: string | undefined;

      // Try to get token ID from refresh token or access token
      if (refreshToken) {
        const decoded = decodeToken(refreshToken);
        tokenId = decoded?.jti;
      } else if (authHeader?.startsWith('Bearer ')) {
        const accessToken = authHeader.substring(7);
        const decoded = decodeToken(accessToken);
        tokenId = decoded?.jti;
      }

      if (tokenId) {
        const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
        await refreshTokenRepo.update(
          { tokenId, revoked: false },
          { revoked: true, revokedAt: new Date() }
        );
      }

      res.json({
        success: true,
        message: 'Wylogowano pomyślnie'
      });
    } catch (error) {
      console.error('Błąd wylogowania:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas wylogowania'
      });
    }
  }

  /**
   * POST /api/auth/logout/all
   * Wylogowanie ze wszystkich sesji (unieważnienie wszystkich tokenów użytkownika)
   */
  static async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
      const result = await refreshTokenRepo.update(
        { userId, revoked: false },
        { revoked: true, revokedAt: new Date() }
      );

      res.json({
        success: true,
        message: 'Wylogowano ze wszystkich sesji',
        data: {
          revokedCount: result.affected || 0
        }
      });
    } catch (error) {
      console.error('Błąd wylogowania ze wszystkich sesji:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas wylogowania'
      });
    }
  }

  /**
   * GET /api/auth/sessions
   * Pobierz listę aktywnych sesji użytkownika
   */
  static async getActiveSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
      const sessions = await refreshTokenRepo.find({
        where: {
          userId,
          revoked: false
        },
        order: {
          createdAt: 'DESC'
        }
      });

      // Filter out expired sessions
      const now = new Date();
      const activeSessions = sessions
        .filter(session => session.expiresAt > now)
        .map(session => ({
          tokenId: session.tokenId,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt
        }));

      res.json({
        success: true,
        data: {
          sessions: activeSessions,
          count: activeSessions.length
        }
      });
    } catch (error) {
      console.error('Błąd pobierania aktywnych sesji:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas pobierania sesji'
      });
    }
  }

  /**
   * GET /api/auth/me
   * Pobierz informacje o zalogowanym użytkowniku
   */
  static async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
        relations: ['role']
      });

      if (!user || !user.active) {
        res.status(404).json({
          success: false,
          message: 'Użytkownik nie znaleziony'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role.name,
          permissions: user.role.permissions,
          lastLogin: user.lastLogin
        }
      });
    } catch (error) {
      console.error('Błąd pobierania danych użytkownika:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * POST /api/auth/change-password
   * Zmiana jednorazowego hasła przez użytkownika
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { newPassword, confirmPassword } = req.body;

      // Verify passwords match
      if (newPassword !== confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'Hasła nie są identyczne'
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
        relations: ['role']
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'Użytkownik nie znaleziony'
        });
        return;
      }

      // Update password
      user.password = newPassword; // Will be hashed by @BeforeUpdate hook
      user.forcePasswordChange = false;
      user.passwordChangedAt = new Date();

      await userRepository.save(user);

      // Send email with new credentials
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const emailContext: PasswordChangedEmailContext = {
          username: user.username,
          firstName: user.firstName,
          newPassword: newPassword, // Send plain password in email as per requirements
          loginUrl: `${frontendUrl}/login`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@grover.pl'
        };

        await EmailService.sendPasswordChangedEmail(user.email, emailContext);
      } catch (emailError) {
        console.error('Błąd wysyłania emaila po zmianie hasła:', emailError);
        // Don't fail the request if email fails
      }

      res.json({
        success: true,
        message: 'Hasło zostało zmienione pomyślnie. Dane logowania wysłano na email.'
      });
    } catch (error) {
      console.error('Błąd zmiany hasła:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas zmiany hasła'
      });
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Odzyskiwanie hasła - generuje nowe hasło i wysyła email
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { emailOrUsername, usernameOrEmail } = req.body;
      const identifier = emailOrUsername || usernameOrEmail;

      if (!identifier) {
        res.status(400).json({
          success: false,
          error: 'MISSING_FIELD',
          message: 'Podaj nazwę użytkownika lub email'
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      
      // Find user by username or email (using separate bindings for security)
      const user = await userRepository
        .createQueryBuilder('user')
        .where('user.username = :username', { username: identifier })
        .orWhere('user.email = :email', { email: identifier })
        .andWhere('user.active = :active', { active: true })
        .andWhere('user.deletedAt IS NULL')
        .getOne();

      // Zawsze zwracaj ten sam komunikat (bezpieczeństwo - nie ujawniaj czy konto istnieje)
      const response = {
        success: true,
        message: 'Jeśli konto istnieje, wysłaliśmy instrukcje na podany adres email'
      };

      if (!user) {
        res.status(200).json(response);
        return;
      }

      // Generuj nowe hasło OTP (One-Time Password)
      const otpPassword = generateRandomPassword(12);

      // Zaktualizuj użytkownika
      user.password = otpPassword; // Zostanie zahashowane przez @BeforeUpdate hook
      user.forcePasswordChange = true;
      user.passwordChangedAt = new Date();
      await userRepository.save(user);

      // Wyślij email z nowym hasłem
      await NotificationService.sendPasswordResetEmail(user, otpPassword);

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in forgotPassword:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Wystąpił błąd serwera'
      });
    }
  }
}

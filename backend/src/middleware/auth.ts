// src/middleware/auth.ts
// Middleware uwierzytelniania JWT

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../config/jwt';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';
import { Role } from '../entities/Role';
import { serverLogger } from '../utils/logger';

// Rozszerzenie typu Request o dane użytkownika
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & {
        role?: Role | string;
        permissions?: any;
      };
      userId?: number;
    }
  }
}

const isParanoidModeEnabled = () => process.env.PARANOID_MODE === 'true';

/**
 * Middleware weryfikacji JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Brak tokenu autoryzacyjnego'
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = verifyAccessToken(token);
      req.userId = payload.userId;

      // Sprawdź czy użytkownik nadal istnieje i jest aktywny
      // Załaduj pełne dane użytkownika z uprawnieniami
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: payload.userId, active: true },
        relations: ['role']
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Użytkownik nieaktywny lub nie istnieje'
        });
        return;
      }

      // Ustaw req.user z pełnymi danymi użytkownika i uprawnieniami z roli
      req.user = {
        ...payload,
        role: user.role as any,
        permissions: user.role.permissions
      };

      // Paranoid mode: verify token exists in database and is not revoked
      if (isParanoidModeEnabled() && payload.jti) {
        const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
        const tokenRecord = await refreshTokenRepo.findOne({
          where: { tokenId: payload.jti, revoked: false }
        });

        if (!tokenRecord) {
          res.status(401).json({
            success: false,
            message: 'Token został unieważniony',
            code: 'TOKEN_REVOKED'
          });
          return;
        }
      }

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Nieprawidłowy lub wygasły token'
      });
      return;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas uwierzytelniania'
    });
  }
};

/**
 * @deprecated Używaj checkPermission(resource, action) zamiast authorize().
 * Ta funkcja sprawdza tylko nazwę roli, nie granularne uprawnienia JSONB.
 * OWASP A01: Broken Access Control
 *
 * W środowisku produkcyjnym rzuca błąd — wymusza migrację do checkPermission().
 */
export const authorize = (...allowedRoles: string[]) => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SECURITY] authorize() jest zabronione w produkcji. ' +
      'Użyj checkPermission(resource, action) zamiast authorize().'
    );
  }

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      serverLogger.warn(
        `[DEPRECATED] authorize() użyte dla roli "${allowedRoles.join(', ')}" — ` +
        `przemigruj do checkPermission(). Ścieżka: ${req.path}`
      );

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      // Pobierz nazwę roli (obsłuż zarówno string jak i obiekt Role)
      const roleName = typeof req.user.role === 'string' 
        ? req.user.role 
        : (req.user.role as any)?.name;

      if (!roleName || !allowedRoles.includes(roleName)) {
        res.status(403).json({
          success: false,
          message: 'Brak uprawnień do wykonania tej operacji'
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas autoryzacji'
      });
    }
  };
};

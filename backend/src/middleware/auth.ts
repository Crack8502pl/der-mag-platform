// src/middleware/auth.ts
// Middleware uwierzytelniania JWT

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../config/jwt';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';

// Rozszerzenie typu Request o dane użytkownika
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userId?: number;
    }
  }
}

const PARANOID_MODE = process.env.PARANOID_MODE === 'true';

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
        role: user.role,
        permissions: user.role.permissions
      };

      // Paranoid mode: verify token exists in database and is not revoked
      if (PARANOID_MODE && payload.jti) {
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
 * Middleware sprawdzania roli użytkownika
 */
export const authorize = (...allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
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

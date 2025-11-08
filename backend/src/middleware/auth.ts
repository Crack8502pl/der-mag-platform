// src/middleware/auth.ts
// Middleware uwierzytelniania JWT

import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../config/jwt';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

// Rozszerzenie typu Request o dane użytkownika
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userId?: number;
    }
  }
}

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
      const payload = verifyToken(token);
      req.user = payload;
      req.userId = payload.userId;

      // Sprawdź czy użytkownik nadal istnieje i jest aktywny
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: payload.userId, active: true }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Użytkownik nieaktywny lub nie istnieje'
        });
        return;
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

// src/controllers/AuthController.ts
// Kontroler uwierzytelniania

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../config/jwt';

export class AuthController {
  /**
   * POST /api/auth/login
   * Logowanie użytkownika
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      
      // Pobierz użytkownika z hasłem
      const user = await userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .leftJoinAndSelect('user.role', 'role')
        .where('user.username = :username', { username })
        .andWhere('user.active = :active', { active: true })
        .getOne();

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Nieprawidłowa nazwa użytkownika lub hasło'
        });
        return;
      }

      // Weryfikuj hasło
      const isPasswordValid = await user.validatePassword(password);

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Nieprawidłowa nazwa użytkownika lub hasło'
        });
        return;
      }

      // Generuj tokeny
      const payload = {
        userId: user.id,
        username: user.username,
        role: user.role.name
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      // Aktualizuj ostatnie logowanie
      user.lastLogin = new Date();
      await userRepository.save(user);

      res.json({
        success: true,
        message: 'Zalogowano pomyślnie',
        data: {
          accessToken,
          refreshToken,
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
   * Odświeżenie tokenu dostępu
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
        const payload = verifyToken(refreshToken);

        // Generuj nowy access token
        const newAccessToken = generateAccessToken({
          userId: payload.userId,
          username: payload.username,
          role: payload.role
        });

        res.json({
          success: true,
          data: {
            accessToken: newAccessToken
          }
        });
      } catch (error) {
        res.status(401).json({
          success: false,
          message: 'Nieprawidłowy refresh token'
        });
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
   * Wylogowanie użytkownika
   */
  static async logout(req: Request, res: Response): Promise<void> {
    // W implementacji JWT logout jest obsługiwany po stronie klienta
    // (usunięcie tokenu z localStorage/cookies)
    res.json({
      success: true,
      message: 'Wylogowano pomyślnie'
    });
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

      if (!user) {
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
}

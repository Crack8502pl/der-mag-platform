// src/controllers/UserPreferencesController.ts
// User preferences controller

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { UserPreferences } from '../entities/UserPreferences';
import { User } from '../entities/User';
import bcrypt from 'bcrypt';

export class UserPreferencesController {
  /**
   * GET /api/users/me/preferences
   * Get preferences for the authenticated user
   */
  static async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const repo = AppDataSource.getRepository(UserPreferences);
      let prefs = await repo.findOne({ where: { userId } });

      if (!prefs) {
        // Return defaults if not yet created
        prefs = repo.create({ userId });
      }

      res.json({ success: true, data: prefs });
    } catch (error: any) {
      console.error('Get preferences error:', error);
      res.status(500).json({ success: false, message: 'Błąd pobierania preferencji' });
    }
  }

  /**
   * PUT /api/users/me/preferences
   * Update preferences for the authenticated user
   */
  static async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const {
        theme,
        emailNotifications,
        pushNotifications,
        notificationSound,
        twoFactorEnabled,
        sessionTimeout
      } = req.body;

      // Validate theme
      const validThemes = ['grover', 'husky', 'auto'];
      if (theme !== undefined && !validThemes.includes(theme)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowy motyw. Dozwolone: grover, husky, auto' });
        return;
      }

      // Validate session timeout
      if (sessionTimeout !== undefined) {
        const timeout = Number(sessionTimeout);
        if (isNaN(timeout) || timeout < 15 || timeout > 1440) {
          res.status(400).json({ success: false, message: 'Timeout sesji musi być między 15 a 1440 minut' });
          return;
        }
      }

      const repo = AppDataSource.getRepository(UserPreferences);
      let prefs = await repo.findOne({ where: { userId } });

      if (!prefs) {
        prefs = repo.create({ userId });
      }

      if (theme !== undefined) prefs.theme = theme;
      if (emailNotifications !== undefined) prefs.emailNotifications = Boolean(emailNotifications);
      if (pushNotifications !== undefined) prefs.pushNotifications = Boolean(pushNotifications);
      if (notificationSound !== undefined) prefs.notificationSound = Boolean(notificationSound);
      if (twoFactorEnabled !== undefined) prefs.twoFactorEnabled = Boolean(twoFactorEnabled);
      if (sessionTimeout !== undefined) prefs.sessionTimeout = Number(sessionTimeout);

      await repo.save(prefs);

      res.json({ success: true, data: prefs, message: 'Preferencje zaktualizowane' });
    } catch (error: any) {
      console.error('Update preferences error:', error);
      res.status(500).json({ success: false, message: 'Błąd aktualizacji preferencji' });
    }
  }

  /**
   * PUT /api/users/me/profile
   * Update profile (firstName, lastName, email) for the authenticated user
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const { firstName, lastName, email, phone } = req.body;

      if (!firstName && !lastName && !email && !phone) {
        res.status(400).json({ success: false, message: 'Brak danych do aktualizacji' });
        return;
      }

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: userId } });

      if (!user) {
        res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
        return;
      }

      if (firstName) user.firstName = firstName.trim();
      if (lastName) user.lastName = lastName.trim();
      if (phone !== undefined) user.phone = phone ? phone.trim() : null;

      if (email) {
        const trimmedEmail = email.trim().toLowerCase();
        // Check if email is already taken by another user
        const existing = await userRepo.findOne({ where: { email: trimmedEmail } });
        if (existing && existing.id !== userId) {
          res.status(409).json({ success: false, message: 'Ten adres email jest już zajęty' });
          return;
        }
        user.email = trimmedEmail;
      }

      await userRepo.save(user);

      res.json({
        success: true,
        message: 'Profil zaktualizowany',
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          username: user.username
        }
      });
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Błąd aktualizacji profilu' });
    }
  }

  /**
   * PUT /api/users/me/password
   * Change password for the authenticated user
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Wymagane: currentPassword, newPassword' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'Nowe hasło musi mieć co najmniej 8 znaków' });
        return;
      }

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { id: userId },
        select: ['id', 'password', 'firstName', 'lastName', 'email', 'username']
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
        return;
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        res.status(401).json({ success: false, message: 'Nieprawidłowe obecne hasło' });
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      user.password = hashedPassword;
      user.forcePasswordChange = false;
      user.passwordChangedAt = new Date();

      await userRepo.save(user);

      res.json({ success: true, message: 'Hasło zmienione pomyślnie' });
    } catch (error: any) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, message: 'Błąd zmiany hasła' });
    }
  }
}

// src/controllers/UserController.ts
// Kontroler zarządzania użytkownikami

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import EmailQueueService from '../services/EmailQueueService';
import { EmailTemplate } from '../types/EmailTypes';
import UserOnboardingService from '../services/UserOnboardingService';

export class UserController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const users = await userRepository.find({
        where: { active: true },
        relations: ['role']
      });

      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const userData = req.body;
      const newUser = userRepository.create(userData) as unknown as User;
      await userRepository.save(newUser);

      // Wysłanie powitalnego emaila (asynchronicznie)
      try {
        if (newUser.email) {
          await EmailQueueService.addToQueue({
            to: newUser.email,
            subject: 'Witaj w Grover Platform!',
            template: EmailTemplate.USER_WELCOME,
            context: {
              username: newUser.username,
              firstName: newUser.firstName || newUser.username,
              loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login`,
              supportEmail: process.env.SUPPORT_EMAIL,
            },
          });
        }
      } catch (emailError) {
        console.error('Błąd wysyłania powitalnego emaila:', emailError);
        // Nie przerywamy procesu w przypadku błędu emaila
      }

      res.status(201).json({ success: true, data: newUser });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRepository = AppDataSource.getRepository(User);
      
      const user = await userRepository.findOne({ where: { id: Number(id) } });
      if (!user) {
        res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
        return;
      }

      Object.assign(user, req.body);
      await userRepository.save(user);

      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Admin: Create user with OTP
   */
  static async createWithOTP(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, firstName, lastName, roleId, phone } = req.body;

      // Validate required fields
      if (!username || !email || !firstName || !lastName || !roleId) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
        return;
      }

      const { user, otp } = await UserOnboardingService.createUserWithOTP({
        username,
        email,
        firstName,
        lastName,
        roleId,
        phone,
      });

      // Return user data and OTP (OTP should be shown to admin once)
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roleId: user.roleId,
            active: user.active,
          },
          otp, // Show OTP to admin
        },
        message: 'User created successfully. OTP sent to user email.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      console.error('Error creating user with OTP:', error);
      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  /**
   * Admin: Get all users (including inactive)
   */
  static async listAll(req: Request, res: Response): Promise<void> {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const users = await userRepository.find({
        relations: ['role'],
        order: { createdAt: 'DESC' },
      });

      res.json({ success: true, data: users });
    } catch (error) {
      console.error('Error listing users:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /**
   * Admin: Deactivate user
   */
  static async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({ where: { id: Number(id) } });
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      user.active = false;
      await userRepository.save(user);

      res.json({ success: true, message: 'User deactivated successfully' });
    } catch (error) {
      console.error('Error deactivating user:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /**
   * Admin: Activate user
   */
  static async activate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({ where: { id: Number(id) } });
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      user.active = true;
      await userRepository.save(user);

      res.json({ success: true, message: 'User activated successfully' });
    } catch (error) {
      console.error('Error activating user:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  /**
   * Admin: Reset user password (generate new OTP)
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await UserOnboardingService.resetPasswordWithOTP(Number(id));

      res.json({
        success: true,
        data: {
          otp: result.otp, // Show OTP to admin
          expiresAt: result.expiresAt,
        },
        message: 'Password reset successfully. New OTP sent to user email.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      console.error('Error resetting password:', error);
      res.status(500).json({
        success: false,
        message: errorMessage,
      });
    }
  }

  /**
   * User: Change own password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password are required',
        });
        return;
      }

      await UserOnboardingService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      console.error('Error changing password:', error);
      res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }
  }
}

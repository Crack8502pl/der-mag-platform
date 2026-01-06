// src/controllers/UserController.ts
// Kontroler zarządzania użytkownikami

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { IsNull } from 'typeorm';
import EmailService from '../services/EmailService';
import bcrypt from 'bcrypt';

export class UserController {
  /**
   * GET /api/users
   * Lista użytkowników z paginacją, filtrowaniem i sortowaniem
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 30,
        role,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        dateFrom,
        dateTo
      } = req.query;

      const userRepository = AppDataSource.getRepository(User);
      const queryBuilder = userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where('user.deletedAt IS NULL');

      // Filtrowanie po roli
      if (role) {
        queryBuilder.andWhere('role.name = :role', { role });
      }

      // Filtrowanie po statusie
      if (status === 'active') {
        queryBuilder.andWhere('user.active = :active', { active: true });
      } else if (status === 'inactive') {
        queryBuilder.andWhere('user.active = :active', { active: false });
      }

      // Wyszukiwanie
      if (search) {
        queryBuilder.andWhere(
          '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search OR user.username ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Filtrowanie po dacie utworzenia
      if (dateFrom) {
        queryBuilder.andWhere('user.createdAt >= :dateFrom', { dateFrom });
      }
      if (dateTo) {
        queryBuilder.andWhere('user.createdAt <= :dateTo', { dateTo });
      }

      // Sortowanie
      const allowedSortFields = ['id', 'firstName', 'lastName', 'email', 'username', 'createdAt', 'lastLogin'];
      const sortField = allowedSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
      const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
      queryBuilder.orderBy(`user.${sortField}`, order);

      // Paginacja
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;

      const [users, total] = await queryBuilder
        .skip(skip)
        .take(limitNum)
        .getManyAndCount();

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      console.error('Błąd pobierania listy użytkowników:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * GET /api/users/:id
   * Szczegóły użytkownika
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: Number(id), deletedAt: IsNull() },
        relations: ['role']
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
        return;
      }

      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Błąd pobierania użytkownika:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * POST /api/users
   * Tworzenie nowego użytkownika (admin wpisuje hasło ręcznie)
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, firstName, lastName, roleId, phone, password } = req.body;

      // Walidacja wymaganych pól
      if (!username || !email || !firstName || !lastName || !roleId || !password) {
        res.status(400).json({
          success: false,
          message: 'Wszystkie wymagane pola muszą być wypełnione'
        });
        return;
      }

      // Walidacja długości
      if (username.length < 3) {
        res.status(400).json({
          success: false,
          message: 'Login musi mieć minimum 3 znaki'
        });
        return;
      }

      if (firstName.length < 2 || lastName.length < 2) {
        res.status(400).json({
          success: false,
          message: 'Imię i nazwisko muszą mieć minimum 2 znaki'
        });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({
          success: false,
          message: 'Hasło musi mieć minimum 8 znaków'
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);

      // Sprawdź czy email lub username już istnieje (wśród aktywnych)
      const existingUser = await userRepository.findOne({
        where: [
          { email, deletedAt: IsNull() },
          { username, deletedAt: IsNull() }
        ]
      });

      if (existingUser) {
        if (existingUser.email === email) {
          res.status(400).json({
            success: false,
            message: 'Użytkownik z tym adresem email już istnieje'
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Użytkownik z tym loginem już istnieje'
          });
        }
        return;
      }

      // Utwórz użytkownika
      const newUser = userRepository.create({
        username,
        email,
        firstName,
        lastName,
        roleId: Number(roleId),
        phone,
        password, // Will be hashed by @BeforeInsert hook
        forcePasswordChange: true,
        active: true
      });

      await userRepository.save(newUser);

      // Wyślij email powitalny
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        
        await EmailService.sendEmail({
          to: newUser.email,
          subject: 'Witaj w Grover Platform - Twoje konto zostało utworzone',
          template: 'user-created-with-password',
          context: {
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            username: newUser.username,
            password: password, // Send plain password
            systemUrl: frontendUrl,
            loginUrl: `${frontendUrl}/login`,
            supportEmail: process.env.SUPPORT_EMAIL || 'smokip@der-mag.pl'
          }
        });
      } catch (emailError) {
        console.error('Błąd wysyłania powitalnego emaila:', emailError);
        // Nie przerywamy procesu
      }

      // Zwróć użytkownika bez hasła
      const { password: _, ...userWithoutPassword } = newUser;

      res.status(201).json({
        success: true,
        data: userWithoutPassword,
        message: 'Użytkownik utworzony pomyślnie. Email z danymi logowania został wysłany.'
      });
    } catch (error) {
      console.error('Błąd tworzenia użytkownika:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * PUT /api/users/:id
   * Aktualizacja użytkownika
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, phone } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      
      const user = await userRepository.findOne({
        where: { id: Number(id), deletedAt: IsNull() }
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
        return;
      }

      // Sprawdź czy email nie jest już zajęty przez innego użytkownika
      if (email && email !== user.email) {
        const existingUser = await userRepository.findOne({
          where: { email, deletedAt: IsNull() }
        });

        if (existingUser && existingUser.id !== user.id) {
          res.status(400).json({
            success: false,
            message: 'Użytkownik z tym adresem email już istnieje'
          });
          return;
        }
      }

      // Aktualizuj pola
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (email) user.email = email;
      if (phone !== undefined) user.phone = phone;

      await userRepository.save(user);

      res.json({
        success: true,
        data: user,
        message: 'Użytkownik zaktualizowany pomyślnie'
      });
    } catch (error) {
      console.error('Błąd aktualizacji użytkownika:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * DELETE /api/users/:id
   * Soft delete użytkownika
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: Number(id), deletedAt: IsNull() }
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
        return;
      }

      // Soft delete
      user.deletedAt = new Date();
      user.active = false;

      await userRepository.save(user);

      res.json({
        success: true,
        message: 'Użytkownik został usunięty'
      });
    } catch (error) {
      console.error('Błąd usuwania użytkownika:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * POST /api/users/:id/reset-password
   * Admin resetuje hasło użytkownika (admin wpisuje nowe hasło)
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { password } = req.body;

      if (!password || password.length < 8) {
        res.status(400).json({
          success: false,
          message: 'Hasło musi mieć minimum 8 znaków'
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: Number(id), deletedAt: IsNull() }
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
        return;
      }

      // Ustaw nowe hasło
      user.password = password; // Will be hashed by @BeforeUpdate hook
      user.forcePasswordChange = true;
      user.passwordChangedAt = new Date();

      await userRepository.save(user);

      // Wyślij email z nowym hasłem
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        
        await EmailService.sendEmail({
          to: user.email,
          subject: 'Reset hasła - Grover Platform',
          template: 'password-reset-with-password',
          context: {
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            password: password,
            systemUrl: frontendUrl,
            loginUrl: `${frontendUrl}/login`,
            supportEmail: process.env.SUPPORT_EMAIL || 'smokip@der-mag.pl'
          }
        });
      } catch (emailError) {
        console.error('Błąd wysyłania emaila resetowania hasła:', emailError);
      }

      res.json({
        success: true,
        message: 'Hasło zostało zresetowane. Email z nowym hasłem został wysłany.'
      });
    } catch (error) {
      console.error('Błąd resetowania hasła:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * POST /api/users/:id/deactivate
   * Dezaktywacja użytkownika
   */
  static async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: Number(id), deletedAt: IsNull() }
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
        return;
      }

      user.active = false;
      await userRepository.save(user);

      // Logowanie powodu (opcjonalnie można dodać pole reason do encji User)
      if (reason) {
        console.log(`Użytkownik ${user.username} dezaktywowany. Powód: ${reason}`);
      }

      res.json({
        success: true,
        message: 'Użytkownik został dezaktywowany'
      });
    } catch (error) {
      console.error('Błąd dezaktywacji użytkownika:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * POST /api/users/:id/activate
   * Aktywacja użytkownika
   */
  static async activate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: Number(id), deletedAt: IsNull() }
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
        return;
      }

      user.active = true;
      await userRepository.save(user);

      res.json({
        success: true,
        message: 'Użytkownik został aktywowany'
      });
    } catch (error) {
      console.error('Błąd aktywacji użytkownika:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * PUT /api/users/:id/role
   * Zmiana roli użytkownika
   */
  static async changeRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { roleId } = req.body;

      if (!roleId) {
        res.status(400).json({
          success: false,
          message: 'ID roli jest wymagane'
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: Number(id), deletedAt: IsNull() },
        relations: ['role']
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
        return;
      }

      user.roleId = Number(roleId);
      await userRepository.save(user);

      // Reload user with role relation
      const updatedUser = await userRepository.findOne({
        where: { id: Number(id) },
        relations: ['role']
      });

      res.json({
        success: true,
        data: updatedUser,
        message: 'Rola użytkownika została zmieniona'
      });
    } catch (error) {
      console.error('Błąd zmiany roli użytkownika:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * GET /api/users/:id/activity
   * Historia aktywności użytkownika
   */
  static async getActivity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50, activityType, dateFrom, dateTo } = req.query;

      // TODO: Implementacja activity logs gdy będzie tabela
      // Na razie zwróć pustą listę
      res.json({
        success: true,
        data: {
          activities: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            totalPages: 0
          }
        },
        message: 'Historia aktywności będzie dostępna wkrótce'
      });
    } catch (error) {
      console.error('Błąd pobierania historii aktywności:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * GET /api/users/:id/permissions
   * Efektywne uprawnienia użytkownika
   */
  static async getPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: Number(id), deletedAt: IsNull() },
        relations: ['role']
      });

      if (!user) {
        res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
        return;
      }

      res.json({
        success: true,
        data: {
          role: user.role.name,
          permissions: user.role.permissions || {}
        }
      });
    } catch (error) {
      console.error('Błąd pobierania uprawnień użytkownika:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
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

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.id = :userId', { userId })
        .getOne();

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
        return;
      }

      // Update password
      user.password = newPassword;
      user.forcePasswordChange = false;
      user.passwordChangedAt = new Date();

      await userRepository.save(user);

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

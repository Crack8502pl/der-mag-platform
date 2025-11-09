// src/controllers/UserController.ts
// Kontroler zarządzania użytkownikami

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import EmailQueueService from '../services/EmailQueueService';
import { EmailTemplate } from '../types/EmailTypes';

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
            subject: 'Witaj w Der-Mag Platform!',
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
}

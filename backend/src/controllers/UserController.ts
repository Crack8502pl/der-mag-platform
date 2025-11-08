// src/controllers/UserController.ts
// Kontroler zarządzania użytkownikami

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

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
      const user = userRepository.create(req.body);
      await userRepository.save(user);

      res.status(201).json({ success: true, data: user });
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

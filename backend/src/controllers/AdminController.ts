// src/controllers/AdminController.ts
// Admin-specific controller for database operations

import { Request, Response } from 'express';
import { DatabaseSeeder } from '../services/DatabaseSeeder';

export class AdminController {
  /**
   * Seed database with initial data (forced)
   */
  static async seedDatabase(req: Request, res: Response): Promise<void> {
    try {
      // Wywołaj DatabaseSeeder z wymuszonym seedowaniem
      await DatabaseSeeder.forceSeed();
      
      res.json({
        success: true,
        message: 'Baza danych została zainicjalizowana',
        data: {
          roles: 10,
          taskTypes: 14,
          adminUser: 'admin'
        }
      });
    } catch (error: any) {
      console.error('Błąd podczas seedowania:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas seedowania bazy danych',
        error: error.message
      });
    }
  }
}

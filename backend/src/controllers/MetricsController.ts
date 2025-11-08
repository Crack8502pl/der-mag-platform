// src/controllers/MetricsController.ts
// Kontroler metryk i statystyk

import { Request, Response } from 'express';
import { MetricsService } from '../services/MetricsService';

export class MetricsController {
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const stats = await MetricsService.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async getTaskTypeStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await MetricsService.getTaskTypeStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const stats = await MetricsService.getUserStats(Number(userId));
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async getDailyStats(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const stats = await MetricsService.getDailyStats(Number(days));
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }
}

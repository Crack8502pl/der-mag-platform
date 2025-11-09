// src/controllers/NotificationController.ts
// Kontroler do zarządzania powiadomieniami email

import { Request, Response } from 'express';
import EmailService from '../services/EmailService';
import EmailQueueService from '../services/EmailQueueService';
import { isEmailConfigured } from '../config/email';

export class NotificationController {
  /**
   * POST /api/notifications/test
   * Testuje wysyłkę emaila
   */
  static async testEmail(req: Request, res: Response): Promise<void> {
    try {
      const { to } = req.body;

      if (!to) {
        res.status(400).json({
          success: false,
          message: 'Pole "to" jest wymagane',
        });
        return;
      }

      if (!isEmailConfigured()) {
        res.status(503).json({
          success: false,
          message: 'System emaili nie jest skonfigurowany. Sprawdź zmienne środowiskowe.',
        });
        return;
      }

      // Wysyłka testowego emaila
      await EmailService.sendEmail({
        to,
        subject: 'Test emaila - Der-Mag Platform',
        template: 'user-welcome',
        context: {
          username: 'test-user',
          firstName: 'Test',
          loginUrl: 'http://localhost:3001/login',
        },
      });

      res.json({
        success: true,
        message: `Email testowy wysłany do: ${to}`,
      });
    } catch (error: any) {
      console.error('Błąd wysyłki testowego emaila:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd wysyłki emaila',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/notifications/queue/stats
   * Zwraca statystyki kolejki emaili
   */
  static async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await EmailQueueService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Błąd pobierania statystyk kolejki:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania statystyk',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/notifications/queue/clear
   * Czyści kolejkę emaili (tylko admin)
   */
  static async clearQueue(req: Request, res: Response): Promise<void> {
    try {
      // Sprawdź uprawnienia użytkownika
      const user = req.user;
      if (!user || user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Brak uprawnień. Tylko administrator może wyczyścić kolejkę.',
        });
        return;
      }

      await EmailQueueService.clearQueue();

      res.json({
        success: true,
        message: 'Kolejka emaili została wyczyszczona',
      });
    } catch (error: any) {
      console.error('Błąd czyszczenia kolejki:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd czyszczenia kolejki',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/notifications/queue/failed
   * Zwraca listę nieudanych wysyłek
   */
  static async getFailedJobs(req: Request, res: Response): Promise<void> {
    try {
      const { start = 0, end = 10 } = req.query;

      const failedJobs = await EmailQueueService.getFailedJobs(
        Number(start),
        Number(end)
      );

      const formattedJobs = failedJobs.map((job) => ({
        id: job.id,
        data: job.data,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
      }));

      res.json({
        success: true,
        data: formattedJobs,
        count: formattedJobs.length,
      });
    } catch (error: any) {
      console.error('Błąd pobierania nieudanych zadań:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania nieudanych zadań',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/notifications/queue/retry/:jobId
   * Ponawia nieudane zadanie
   */
  static async retryFailedJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      await EmailQueueService.retryFailedJob(jobId);

      res.json({
        success: true,
        message: `Zadanie ${jobId} zostało ponowione`,
      });
    } catch (error: any) {
      console.error('Błąd ponowienia zadania:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd ponowienia zadania',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/notifications/config
   * Sprawdza konfigurację systemu emaili
   */
  static async checkConfig(req: Request, res: Response): Promise<void> {
    try {
      const configured = isEmailConfigured();
      const connectionOk = configured ? await EmailService.verifyConnection() : false;

      res.json({
        success: true,
        data: {
          configured,
          connectionOk,
          message: configured
            ? connectionOk
              ? 'System emaili jest poprawnie skonfigurowany'
              : 'System emaili jest skonfigurowany, ale połączenie SMTP nie działa'
            : 'System emaili nie jest skonfigurowany',
        },
      });
    } catch (error: any) {
      console.error('Błąd sprawdzania konfiguracji:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd sprawdzania konfiguracji',
        error: error.message,
      });
    }
  }
}

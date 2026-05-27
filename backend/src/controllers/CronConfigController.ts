// src/controllers/CronConfigController.ts
// REST API for managing CRON job schedules at runtime

import { Request, Response } from 'express';
import { CronConfigService } from '../services/CronConfigService';

export class CronConfigController {
  /**
   * GET /api/admin/cron/schedules
   * Returns all CRON job configurations
   */
  static getAll(req: Request, res: Response): void {
    try {
      const jobs = CronConfigService.getAll();
      res.json({ success: true, data: jobs });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ CronConfigController.getAll ERROR:', error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * PUT /api/admin/cron/schedules/:jobId
   * Update cron expression and enabled state for a job
   * Body: { cronExpression: string, enabled: boolean }
   */
  static update(req: Request, res: Response): void {
    try {
      const { jobId } = req.params;
      const { cronExpression, enabled } = req.body;

      if (typeof cronExpression !== 'string' || cronExpression.trim() === '') {
        res.status(400).json({ success: false, message: 'Pole cronExpression jest wymagane' });
        return;
      }
      if (typeof enabled !== 'boolean') {
        res.status(400).json({ success: false, message: 'Pole enabled musi być wartością boolean' });
        return;
      }

      const updated = CronConfigService.update(jobId, cronExpression.trim(), enabled);
      res.json({ success: true, data: updated });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ CronConfigController.update ERROR:', error);
      const status = msg.includes('nie istnieje') || msg.includes('Nieprawidłowe') ? 400 : 500;
      res.status(status).json({ success: false, message: msg });
    }
  }

  /**
   * POST /api/admin/cron/schedules/:jobId/trigger
   * Immediately trigger a job outside of its schedule
   */
  static async triggerNow(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      await CronConfigService.triggerNow(jobId);
      res.json({ success: true, message: `Job '${jobId}' uruchomiony ręcznie` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ CronConfigController.triggerNow ERROR:', error);
      const status = msg.includes('nie istnieje') ? 404 : msg.includes('już uruchomiony') ? 409 : 500;
      res.status(status).json({ success: false, message: msg });
    }
  }
}

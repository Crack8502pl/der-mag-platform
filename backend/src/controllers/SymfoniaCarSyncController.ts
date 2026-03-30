// src/controllers/SymfoniaCarSyncController.ts
// Controller for Symfonia cars sync endpoints - admin only

import { Request, Response } from 'express';
import { SymfoniaCarSyncService } from '../services/SymfoniaCarSyncService';

export class SymfoniaCarSyncController {
  /**
   * POST /api/admin/symfonia-sync/cars/sync
   * Synchronizacja samochodów (tylko admin)
   */
  static async sync(req: Request, res: Response): Promise<void> {
    try {
      const rawUserId = (req as any).user?.userId ?? (req as any).userId;
      if (rawUserId === undefined || rawUserId === null) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const userId = Number(rawUserId);
      const result = await SymfoniaCarSyncService.syncCars(userId);
      res.json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ SymfoniaCarSyncController.sync ERROR:', error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-sync/cars/status
   * Status ostatniej synchronizacji samochodów
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await SymfoniaCarSyncService.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ SymfoniaCarSyncController.getStatus ERROR:', error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-sync/cars/history
   * Historia synchronizacji samochodów
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const parsedLimit = parseInt(String(req.query.limit ?? '10'), 10);
      const limit = Math.min(Math.max(Number.isNaN(parsedLimit) ? 10 : parsedLimit, 1), 100);
      const history = await SymfoniaCarSyncService.getHistory(limit);
      res.json({ success: true, data: history });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ SymfoniaCarSyncController.getHistory ERROR:', error);
      res.status(500).json({ success: false, message: msg });
    }
  }
}

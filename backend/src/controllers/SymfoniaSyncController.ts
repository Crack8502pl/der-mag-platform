// src/controllers/SymfoniaSyncController.ts
// Controller for Symfonia warehouse sync endpoints - admin only

import { Request, Response } from 'express';
import { SymfoniaSyncService } from '../services/SymfoniaSyncService';

export class SymfoniaSyncController {
  /**
   * POST /api/admin/symfonia-sync/full
   * Pełna synchronizacja (tylko admin)
   */
  static async fullSync(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const result = await SymfoniaSyncService.fullSync(Number(userId));
      res.json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ SymfoniaSyncController.fullSync ERROR:', error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * POST /api/admin/symfonia-sync/quick
   * Szybka synchronizacja ilości (tylko admin)
   */
  static async quickSync(req: Request, res: Response): Promise<void> {
    try {
      const result = await SymfoniaSyncService.quickStockSync();
      res.json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ SymfoniaSyncController.quickSync ERROR:', error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-sync/status
   * Status ostatniej synchronizacji
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await SymfoniaSyncService.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ SymfoniaSyncController.getStatus ERROR:', error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-sync/history
   * Historia synchronizacji
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || '10'), 10), 100);
      const history = await SymfoniaSyncService.getHistory(limit);
      res.json({ success: true, data: history });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ SymfoniaSyncController.getHistory ERROR:', error);
      res.status(500).json({ success: false, message: msg });
    }
  }
}

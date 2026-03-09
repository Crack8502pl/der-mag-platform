// src/controllers/SymfoniaContractSyncController.ts
// Controller for Symfonia contracts sync endpoints - admin only

import { Request, Response } from 'express';
import { SymfoniaContractSyncService, type ContractSyncProgress } from '../services/SymfoniaContractSyncService';

export class SymfoniaContractSyncController {
  /**
   * POST /api/admin/symfonia-sync/contracts/full
   * Pełna synchronizacja kontraktów (tylko admin)
   */
  static async fullSync(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const result = await SymfoniaContractSyncService.fullSync(Number(userId));
      res.json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ SymfoniaContractSyncController.fullSync ERROR:', error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * POST /api/admin/symfonia-sync/contracts/quick
   * Szybka synchronizacja statusów kontraktów (tylko admin)
   */
  static async quickSync(req: Request, res: Response): Promise<void> {
    try {
      const result = await SymfoniaContractSyncService.quickSync();
      res.json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ SymfoniaContractSyncController.quickSync ERROR:', error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-sync/contracts/status
   * Status ostatniej synchronizacji kontraktów
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await SymfoniaContractSyncService.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ SymfoniaContractSyncController.getStatus ERROR:', error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-sync/contracts/history
   * Historia synchronizacji kontraktów
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || '10'), 10), 100);
      const history = await SymfoniaContractSyncService.getHistory(limit);
      res.json({ success: true, data: history });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ SymfoniaContractSyncController.getHistory ERROR:', error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-sync/contracts/progress
   * Server-Sent Events stream for contract sync progress tracking
   */
  static async getProgress(req: Request, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendProgress = (progress: ContractSyncProgress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    };

    SymfoniaContractSyncService.subscribeToProgress(sendProgress);

    req.on('close', () => {
      SymfoniaContractSyncService.unsubscribeFromProgress(sendProgress);
    });
  }
}

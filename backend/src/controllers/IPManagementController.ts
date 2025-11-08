// src/controllers/IPManagementController.ts
// Kontroler zarządzania adresami IP

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { IPPool } from '../entities/IPPool';
import { IPAllocator } from '../services/IPAllocator';

export class IPManagementController {
  static async getPools(req: Request, res: Response): Promise<void> {
    try {
      const poolRepository = AppDataSource.getRepository(IPPool);
      const pools = await poolRepository.find({
        where: { active: true },
        relations: ['taskType']
      });

      res.json({ success: true, data: pools });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async allocateIP(req: Request, res: Response): Promise<void> {
    try {
      const { poolId } = req.body;
      const ipAddress = await IPAllocator.allocateIP(poolId);

      res.json({ success: true, data: { ipAddress } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async releaseIP(req: Request, res: Response): Promise<void> {
    try {
      const { poolId, ipAddress } = req.body;
      await IPAllocator.releaseIP(poolId, ipAddress);

      res.json({ success: true, message: 'Adres IP zwolniony' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

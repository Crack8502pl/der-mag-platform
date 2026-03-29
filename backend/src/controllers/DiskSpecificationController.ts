// src/controllers/DiskSpecificationController.ts
// REST API controller for disk specifications

import { Request, Response } from 'express';
import { DiskConfigurationService } from '../services/DiskConfigurationService';

export class DiskSpecificationController {
  /**
   * GET /api/disk-specifications
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const disks = await DiskConfigurationService.getAllDisks();
      res.json({ success: true, data: disks });
    } catch (error: any) {
      console.error('Error fetching disk specifications:', error);
      res.status(500).json({ error: 'Failed to fetch disk specifications', message: error.message });
    }
  }

  /**
   * GET /api/disk-specifications/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }
      const disk = await DiskConfigurationService.getDisk(id);
      if (!disk) {
        res.status(404).json({ error: 'Disk specification not found' });
        return;
      }
      res.json({ success: true, data: disk });
    } catch (error: any) {
      console.error('Error fetching disk specification:', error);
      res.status(500).json({ error: 'Failed to fetch disk specification', message: error.message });
    }
  }

  /**
   * POST /api/disk-specifications/calculate
   * Calculate disk configuration for given parameters.
   * Body: { cameraCount, recordingDays, bitrateMbps?, recorderId? }
   */
  static async calculate(req: Request, res: Response): Promise<void> {
    try {
      const { cameraCount, recordingDays, bitrateMbps = 4.0, recorderId = 0, diskSlots = 4 } = req.body;

      if (!cameraCount || !recordingDays) {
        res.status(400).json({ error: 'Missing required fields: cameraCount, recordingDays' });
        return;
      }

      const requiredTb = DiskConfigurationService.calculateRequiredStorage(
        Number(cameraCount),
        Number(recordingDays),
        Number(bitrateMbps)
      );

      const diskSelections = await DiskConfigurationService.selectOptimalDisks(
        requiredTb,
        Number(recorderId),
        Number(diskSlots)
      );

      res.json({
        success: true,
        data: {
          requiredTb,
          diskSelections,
          totalTb: diskSelections.reduce((sum, s) => sum + s.totalTb, 0),
          totalDisks: diskSelections.reduce((sum, s) => sum + s.quantity, 0)
        }
      });
    } catch (error: any) {
      console.error('Error calculating disk configuration:', error);
      res.status(500).json({ error: 'Failed to calculate disk configuration', message: error.message });
    }
  }

  /**
   * POST /api/disk-specifications
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      if (!data.warehouseStockId || !data.capacityTb) {
        res.status(400).json({ error: 'Missing required fields: warehouseStockId, capacityTb' });
        return;
      }
      const disk = await DiskConfigurationService.createDisk(data);
      res.status(201).json({ success: true, data: disk });
    } catch (error: any) {
      console.error('Error creating disk specification:', error);
      res.status(500).json({ error: 'Failed to create disk specification', message: error.message });
    }
  }

  /**
   * PUT /api/disk-specifications/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }
      const disk = await DiskConfigurationService.updateDisk(id, req.body);
      res.json({ success: true, data: disk });
    } catch (error: any) {
      console.error('Error updating disk specification:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({ error: 'Disk specification not found', message: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update disk specification', message: error.message });
      }
    }
  }

  /**
   * DELETE /api/disk-specifications/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }
      await DiskConfigurationService.deleteDisk(id);
      res.json({ success: true, message: 'Disk specification deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting disk specification:', error);
      res.status(500).json({ error: 'Failed to delete disk specification', message: error.message });
    }
  }
}

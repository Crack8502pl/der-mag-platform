// src/controllers/RecorderSpecificationController.ts
// REST API controller for recorder specifications

import { Request, Response } from 'express';
import { RecorderSelectionService } from '../services/RecorderSelectionService';

export class RecorderSpecificationController {
  /**
   * GET /api/recorder-specifications
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const recorders = await RecorderSelectionService.getAllRecorders();
      res.json({ success: true, data: recorders });
    } catch (error: any) {
      console.error('Error fetching recorder specifications:', error);
      res.status(500).json({ error: 'Failed to fetch recorder specifications', message: error.message });
    }
  }

  /**
   * GET /api/recorder-specifications/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }
      const recorder = await RecorderSelectionService.getRecorder(id);
      if (!recorder) {
        res.status(404).json({ error: 'Recorder specification not found' });
        return;
      }
      res.json({ success: true, data: recorder });
    } catch (error: any) {
      console.error('Error fetching recorder specification:', error);
      res.status(500).json({ error: 'Failed to fetch recorder specification', message: error.message });
    }
  }

  /**
   * GET /api/recorder-specifications/select/:cameraCount
   * Select the appropriate recorder for a given camera count.
   */
  static async selectForCameras(req: Request, res: Response): Promise<void> {
    try {
      const cameraCount = parseInt(req.params.cameraCount);
      if (isNaN(cameraCount) || cameraCount <= 0) {
        res.status(400).json({ error: 'Invalid camera count' });
        return;
      }
      const recorder = await RecorderSelectionService.selectRecorder(cameraCount);
      if (!recorder) {
        res.status(404).json({ error: `No recorder found for ${cameraCount} cameras` });
        return;
      }
      res.json({ success: true, data: recorder });
    } catch (error: any) {
      console.error('Error selecting recorder:', error);
      res.status(500).json({ error: 'Failed to select recorder', message: error.message });
    }
  }

  /**
   * POST /api/recorder-specifications
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      if (!data.warehouseStockId || !data.modelName || !data.maxCameras) {
        res.status(400).json({ error: 'Missing required fields: warehouseStockId, modelName, maxCameras' });
        return;
      }
      const recorder = await RecorderSelectionService.createRecorder(data);
      res.status(201).json({ success: true, data: recorder });
    } catch (error: any) {
      console.error('Error creating recorder specification:', error);
      res.status(500).json({ error: 'Failed to create recorder specification', message: error.message });
    }
  }

  /**
   * PUT /api/recorder-specifications/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }
      const recorder = await RecorderSelectionService.updateRecorder(id, req.body);
      res.json({ success: true, data: recorder });
    } catch (error: any) {
      console.error('Error updating recorder specification:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({ error: 'Recorder specification not found', message: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update recorder specification', message: error.message });
      }
    }
  }

  /**
   * DELETE /api/recorder-specifications/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid ID' });
        return;
      }
      await RecorderSelectionService.deleteRecorder(id);
      res.json({ success: true, message: 'Recorder specification deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting recorder specification:', error);
      res.status(500).json({ error: 'Failed to delete recorder specification', message: error.message });
    }
  }
}

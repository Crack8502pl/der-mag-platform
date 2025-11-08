// src/controllers/BOMController.ts
// Kontroler zarządzania BOM (Bill of Materials)

import { Request, Response } from 'express';
import { BOMService } from '../services/BOMService';

export class BOMController {
  static async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { taskType } = req.params;
      const templates = taskType 
        ? await BOMService.getTemplatesForTaskType(Number(taskType))
        : [];

      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const template = await BOMService.createTemplate(req.body);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async getTaskMaterials(req: Request, res: Response): Promise<void> {
    try {
      const { taskNumber } = req.params;
      const { AppDataSource } = await import('../config/database');
      const { Task } = await import('../entities/Task');
      
      const task = await AppDataSource.getRepository(Task).findOne({
        where: { taskNumber }
      });

      if (!task) {
        res.status(404).json({ success: false, message: 'Zadanie nie znalezione' });
        return;
      }

      const materials = await BOMService.getTaskMaterials(task.id);
      res.json({ success: true, data: materials });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async updateMaterial(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { usedQuantity, serialNumbers } = req.body;
      
      const material = await BOMService.updateMaterialUsage(Number(id), usedQuantity, serialNumbers);
      res.json({ success: true, data: material });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

// src/controllers/ActivityController.ts
// Kontroler zarządzania aktywnościami

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { ActivityTemplate } from '../entities/ActivityTemplate';
import { TaskActivity } from '../entities/TaskActivity';

export class ActivityController {
  static async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { taskType } = req.params;
      const templateRepository = AppDataSource.getRepository(ActivityTemplate);
      
      const where: any = { active: true };
      if (taskType) {
        where.taskTypeId = Number(taskType);
      }

      const templates = await templateRepository.find({
        where,
        order: { sequence: 'ASC' }
      });

      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async getTaskActivities(req: Request, res: Response): Promise<void> {
    try {
      const { taskNumber } = req.params;
      const { Task } = await import('../entities/Task');
      
      const task = await AppDataSource.getRepository(Task).findOne({
        where: { taskNumber }
      });

      if (!task) {
        res.status(404).json({ success: false, message: 'Zadanie nie znalezione' });
        return;
      }

      const activityRepository = AppDataSource.getRepository(TaskActivity);
      const activities = await activityRepository.find({
        where: { taskId: task.id },
        relations: ['completedBy'],
        order: { sequence: 'ASC' }
      });

      res.json({ success: true, data: activities });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  static async completeActivity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId!;
      const activityRepository = AppDataSource.getRepository(TaskActivity);

      const activity = await activityRepository.findOne({ where: { id: Number(id) } });
      if (!activity) {
        res.status(404).json({ success: false, message: 'Aktywność nie znaleziona' });
        return;
      }

      activity.isCompleted = true;
      activity.completedAt = new Date();
      activity.completedById = userId;
      await activityRepository.save(activity);

      res.json({ success: true, data: activity });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }
}

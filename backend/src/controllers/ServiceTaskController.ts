// src/controllers/ServiceTaskController.ts
// Controller for service tasks endpoints

import { Request, Response } from 'express';
import { ServiceTaskService } from '../services/ServiceTaskService';
import { ServiceTaskStatus, ServiceTaskVariant } from '../entities/ServiceTask';

export class ServiceTaskController {
  private serviceTaskService = new ServiceTaskService();

  /**
   * POST /api/service-tasks
   * Create a new service task
   */
  createTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const {
        title,
        description,
        variant,
        contractId,
        subsystemId,
        brigadeId,
        plannedStartDate,
        plannedEndDate,
        priority,
        metadata,
      } = req.body;

      if (!title || !variant) {
        res.status(400).json({
          success: false,
          message: 'Tytuł i wariant są wymagane',
        });
        return;
      }

      const task = await this.serviceTaskService.createTask({
        title,
        description,
        variant: variant as ServiceTaskVariant,
        contractId,
        subsystemId,
        brigadeId,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : undefined,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : undefined,
        priority,
        metadata,
        createdById: userId,
      });

      res.status(201).json({
        success: true,
        message: 'Zadanie serwisowe utworzone pomyślnie',
        data: task,
      });
    } catch (error: any) {
      console.error('Error creating service task:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas tworzenia zadania',
        error: error.message,
      });
    }
  };

  /**
   * GET /api/service-tasks
   * Get all service tasks with filters
   */
  getTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        status,
        variant,
        contractId,
        subsystemId,
        brigadeId,
        createdById,
        page = 1,
        limit = 20,
      } = req.query;

      const { tasks, total } = await this.serviceTaskService.getTasks({
        status: status as ServiceTaskStatus,
        variant: variant as ServiceTaskVariant,
        contractId: contractId ? Number(contractId) : undefined,
        subsystemId: subsystemId ? Number(subsystemId) : undefined,
        brigadeId: brigadeId ? Number(brigadeId) : undefined,
        createdById: createdById ? Number(createdById) : undefined,
        page: Number(page),
        limit: Number(limit),
      });

      res.json({
        success: true,
        data: tasks,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error('Error getting service tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania zadań',
        error: error.message,
      });
    }
  };

  /**
   * GET /api/service-tasks/:id
   * Get service task by ID
   */
  getTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const task = await this.serviceTaskService.getTaskById(Number(id));

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Zadanie nie znalezione',
        });
        return;
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error: any) {
      console.error('Error getting service task:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania zadania',
        error: error.message,
      });
    }
  };

  /**
   * PUT /api/service-tasks/:id
   * Update service task
   */
  updateTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data = req.body;

      // Convert date strings to Date objects
      if (data.plannedStartDate) {
        data.plannedStartDate = new Date(data.plannedStartDate);
      }
      if (data.plannedEndDate) {
        data.plannedEndDate = new Date(data.plannedEndDate);
      }

      const task = await this.serviceTaskService.updateTask(Number(id), data);

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Zadanie nie znalezione',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Zadanie zaktualizowane pomyślnie',
        data: task,
      });
    } catch (error: any) {
      console.error('Error updating service task:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas aktualizacji zadania',
        error: error.message,
      });
    }
  };

  /**
   * PATCH /api/service-tasks/:id/status
   * Update task status
   */
  updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status jest wymagany',
        });
        return;
      }

      const task = await this.serviceTaskService.updateStatus(
        Number(id),
        status as ServiceTaskStatus,
        userId
      );

      res.json({
        success: true,
        message: 'Status zadania zaktualizowany pomyślnie',
        data: task,
      });
    } catch (error: any) {
      console.error('Error updating task status:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas aktualizacji statusu',
        error: error.message,
      });
    }
  };

  /**
   * POST /api/service-tasks/:id/assign-brigade
   * Assign brigade to task
   */
  assignBrigade = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { brigadeId } = req.body;

      if (!brigadeId) {
        res.status(400).json({
          success: false,
          message: 'ID brygady jest wymagane',
        });
        return;
      }

      const task = await this.serviceTaskService.assignBrigade(
        Number(id),
        Number(brigadeId),
        userId
      );

      res.json({
        success: true,
        message: 'Brygada przypisana pomyślnie',
        data: task,
      });
    } catch (error: any) {
      console.error('Error assigning brigade:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas przypisywania brygady',
        error: error.message,
      });
    }
  };

  /**
   * POST /api/service-tasks/:id/activities
   * Add activity to task
   */
  addActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const { description, activityType, metadata } = req.body;

      if (!description || !activityType) {
        res.status(400).json({
          success: false,
          message: 'Opis i typ czynności są wymagane',
        });
        return;
      }

      const activity = await this.serviceTaskService.addActivity(Number(id), {
        description,
        activityType,
        performedById: userId,
        metadata,
      });

      res.status(201).json({
        success: true,
        message: 'Czynność dodana pomyślnie',
        data: activity,
      });
    } catch (error: any) {
      console.error('Error adding activity:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas dodawania czynności',
        error: error.message,
      });
    }
  };

  /**
   * GET /api/service-tasks/:id/activities
   * Get task activities
   */
  getActivities = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const activities = await this.serviceTaskService.getTaskActivities(Number(id));

      res.json({
        success: true,
        data: activities,
      });
    } catch (error: any) {
      console.error('Error getting activities:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania czynności',
        error: error.message,
      });
    }
  };

  /**
   * DELETE /api/service-tasks/:id
   * Delete (soft delete) service task
   */
  deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.serviceTaskService.deleteTask(Number(id));

      res.json({
        success: true,
        message: 'Zadanie usunięte pomyślnie',
      });
    } catch (error: any) {
      console.error('Error deleting service task:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas usuwania zadania',
        error: error.message,
      });
    }
  };

  /**
   * GET /api/service-tasks/stats
   * Get service tasks statistics
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.serviceTaskService.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania statystyk',
        error: error.message,
      });
    }
  };
}

export default new ServiceTaskController();

// src/controllers/TaskController.ts
// Kontroler zarządzania zadaniami

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Task } from '../entities/Task';
import { TaskType } from '../entities/TaskType';
import { TaskService } from '../services/TaskService';
import { TaskAssignment } from '../entities/TaskAssignment';
import { PAGINATION } from '../config/constants';

export class TaskController {
  /**
   * GET /api/tasks
   * Lista wszystkich zadań z filtrami
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { 
        page = PAGINATION.DEFAULT_PAGE, 
        limit = PAGINATION.DEFAULT_LIMIT,
        status,
        taskTypeId,
        search
      } = req.query;

      const taskRepository = AppDataSource.getRepository(Task);
      const queryBuilder = taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.taskType', 'taskType')
        .where('task.deleted_at IS NULL');

      if (status) {
        queryBuilder.andWhere('task.status = :status', { status });
      }

      if (taskTypeId) {
        queryBuilder.andWhere('task.task_type_id = :taskTypeId', { taskTypeId });
      }

      if (search) {
        queryBuilder.andWhere(
          '(task.task_number LIKE :search OR task.title LIKE :search OR task.description LIKE :search)',
          { search: `%${search}%` }
        );
      }

      const take = Math.min(Number(limit), PAGINATION.MAX_LIMIT);
      const skip = (Number(page) - 1) * take;

      queryBuilder.take(take).skip(skip);
      queryBuilder.orderBy('task.created_at', 'DESC');

      const [tasks, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: tasks,
        pagination: {
          page: Number(page),
          limit: take,
          total,
          pages: Math.ceil(total / take)
        }
      });
    } catch (error) {
      console.error('Błąd pobierania listy zadań:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * GET /api/tasks/my
   * Zadania przypisane do zalogowanego użytkownika
   */
  static async myTasks(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const assignmentRepository = AppDataSource.getRepository(TaskAssignment);

      const assignments = await assignmentRepository.find({
        where: { userId },
        relations: ['task', 'task.taskType']
      });

      const tasks = assignments
        .map(a => a.task)
        .filter(t => !t.deletedAt);

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('Błąd pobierania moich zadań:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * GET /api/tasks/:taskNumber
   * Pobierz szczegóły zadania
   */
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const { taskNumber } = req.params;
      const taskRepository = AppDataSource.getRepository(Task);

      const task = await taskRepository.findOne({
        where: { taskNumber, deletedAt: null as any },
        relations: [
          'taskType',
          'parentTask',
          'childTasks',
          'materials',
          'devices',
          'activities',
          'photos',
          'assignments',
          'assignments.user'
        ]
      });

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Zadanie nie znalezione'
        });
        return;
      }

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error('Błąd pobierania zadania:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * POST /api/tasks
   * Utwórz nowe zadanie
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { taskTypeId } = req.body;
      const user = req.user;

      // Sprawdź uprawnienia koordynatora do tworzenia zadań
      if (user?.role === 'coordinator') {
        // Pobierz typ zadania
        const taskTypeRepository = AppDataSource.getRepository(TaskType);
        const taskType = await taskTypeRepository.findOne({
          where: { id: taskTypeId, active: true }
        });

        if (!taskType) {
          res.status(404).json({
            success: false,
            message: 'Typ zadania nie znaleziony'
          });
          return;
        }

        // Koordynator może tworzyć tylko zadania typu SERWIS
        if (taskType.code !== 'SERWIS') {
          res.status(403).json({
            success: false,
            message: 'Koordynator może tworzyć tylko zadania serwisowe'
          });
          return;
        }
      }

      const task = await TaskService.createTask(req.body);

      res.status(201).json({
        success: true,
        message: 'Zadanie utworzone pomyślnie',
        data: task
      });
    } catch (error: any) {
      console.error('Błąd tworzenia zadania:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Błąd serwera'
      });
    }
  }

  /**
   * PUT /api/tasks/:taskNumber
   * Aktualizuj zadanie
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { taskNumber } = req.params;
      const taskRepository = AppDataSource.getRepository(Task);

      const task = await taskRepository.findOne({
        where: { taskNumber, deletedAt: null as any }
      });

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Zadanie nie znalezione'
        });
        return;
      }

      Object.assign(task, req.body);
      await taskRepository.save(task);

      res.json({
        success: true,
        message: 'Zadanie zaktualizowane pomyślnie',
        data: task
      });
    } catch (error) {
      console.error('Błąd aktualizacji zadania:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * PATCH /api/tasks/:taskNumber/status
   * Aktualizuj status zadania
   */
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { taskNumber } = req.params;
      const { status } = req.body;
      const userId = req.userId!;

      const task = await TaskService.updateTaskStatus(taskNumber, status, userId);

      res.json({
        success: true,
        message: 'Status zadania zaktualizowany',
        data: task
      });
    } catch (error: any) {
      console.error('Błąd aktualizacji statusu:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Błąd serwera'
      });
    }
  }

  /**
   * DELETE /api/tasks/:taskNumber
   * Usuń zadanie (soft delete)
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { taskNumber } = req.params;
      const taskRepository = AppDataSource.getRepository(Task);

      const task = await taskRepository.findOne({
        where: { taskNumber, deletedAt: null as any }
      });

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Zadanie nie znalezione'
        });
        return;
      }

      task.deletedAt = new Date();
      await taskRepository.save(task);

      res.json({
        success: true,
        message: 'Zadanie usunięte pomyślnie'
      });
    } catch (error) {
      console.error('Błąd usuwania zadania:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * POST /api/tasks/:taskNumber/assign
   * Przypisz użytkowników do zadania
   */
  static async assign(req: Request, res: Response): Promise<void> {
    try {
      const { taskNumber } = req.params;
      const { userIds } = req.body;
      const assignedById = req.userId!;

      const taskRepository = AppDataSource.getRepository(Task);
      const assignmentRepository = AppDataSource.getRepository(TaskAssignment);

      const task = await taskRepository.findOne({
        where: { taskNumber, deletedAt: null as any }
      });

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Zadanie nie znalezione'
        });
        return;
      }

      const assignments = [];
      for (const userId of userIds) {
        const existing = await assignmentRepository.findOne({
          where: { taskId: task.id, userId }
        });

        if (!existing) {
          const assignment = assignmentRepository.create({
            taskId: task.id,
            userId,
            assignedById
          });
          assignments.push(await assignmentRepository.save(assignment));
        }
      }

      res.json({
        success: true,
        message: 'Użytkownicy przypisani do zadania',
        data: assignments
      });
    } catch (error) {
      console.error('Błąd przypisywania użytkowników:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }
}

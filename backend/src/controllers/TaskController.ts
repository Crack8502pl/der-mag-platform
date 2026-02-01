// src/controllers/TaskController.ts
// Kontroler zarządzania zadaniami

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Task } from '../entities/Task';
import { TaskType } from '../entities/TaskType';
import { TaskService } from '../services/TaskService';
import { TaskAssignment } from '../entities/TaskAssignment';
import { PAGINATION } from '../config/constants';
import EmailQueueService from '../services/EmailQueueService';
import { EmailTemplate } from '../types/EmailTypes';
import { User } from '../entities/User';

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
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const taskRepository = AppDataSource.getRepository(Task);
      const queryBuilder = taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.taskType', 'taskType')
        .leftJoinAndSelect('task.contract', 'contract')
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

      // POPRAWIONE: Dynamiczne sortowanie z prawidłowym mapowaniem
      // Używamy nazw z ENCJI (camelCase), NIE nazw kolumn bazy danych (snake_case)
      const allowedSortFields = ['taskNumber', 'title', 'status', 'priority', 'createdAt', 'updatedAt', 'taskType', 'contractNumber'];
      const sortField = allowedSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
      const order = (sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      switch (sortField) {
        case 'taskNumber':
          queryBuilder.orderBy('task.taskNumber', order);
          break;
        case 'title':
          queryBuilder.orderBy('task.title', order);
          break;
        case 'status':
          queryBuilder.orderBy('task.status', order);
          break;
        case 'priority':
          queryBuilder.orderBy('task.priority', order);
          break;
        case 'taskType':
          queryBuilder.orderBy('taskType.name', order);
          break;
        case 'contractNumber':
          queryBuilder.orderBy('task.contractNumber', order);
          break;
        case 'updatedAt':
          queryBuilder.orderBy('task.updatedAt', order);
          break;
        case 'createdAt':
        default:
          queryBuilder.orderBy('task.createdAt', order);
          break;
      }

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
      const userRepository = AppDataSource.getRepository(User);

      // Fetch full user with role relation to access role permissions
      // req.user from JWT doesn't include the role relation by default
      const fullUser = await userRepository.findOne({
        where: { id: req.userId },
        relations: ['role']
      });

      if (!fullUser || !fullUser.role) {
        res.status(403).json({
          success: false,
          message: 'Brak przypisanej roli użytkownika'
        });
        return;
      }

      // Sprawdź uprawnienia koordynatora do tworzenia zadań
      if (fullUser.role.name === 'coordinator') {
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
            message: 'Koordynator może tworzyć tylko zadania serwisowe',
            allowedTypes: ['SERWIS'],
            attemptedType: taskType.code
          });
          return;
        }
      }

      const task = await TaskService.createTask(req.body);

      // Wysłanie emaila o utworzeniu zadania (asynchronicznie)
      try {
        // Znajdź managerów/adminów do powiadomienia
        const userRepository = AppDataSource.getRepository(User);
        const managers = await userRepository.find({
          where: { active: true },
          relations: ['role']
        });

        const managerEmails = managers
          .filter(u => u.role && (u.role.name === 'admin' || u.role.name === 'manager'))
          .map(u => u.email)
          .filter(email => email && email.length > 0);

        if (managerEmails.length > 0) {
          await EmailQueueService.addToQueue({
            to: managerEmails,
            subject: `Nowe zadanie: ${task.title} (#${task.taskNumber})`,
            template: EmailTemplate.TASK_CREATED,
            context: {
              taskNumber: task.taskNumber,
              taskName: task.title,
              taskType: task.taskType?.name || 'Nieznany',
              createdBy: req.user?.username || 'System',
              location: task.location || 'Nie określono',
              url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/tasks/${task.taskNumber}`,
            },
          });
        }
      } catch (emailError) {
        console.error('Błąd wysyłania emaila o utworzeniu zadania:', emailError);
        // Nie przerywamy procesu w przypadku błędu emaila
      }

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
      const userRepository = AppDataSource.getRepository(User);
      const assignmentRepository = AppDataSource.getRepository(TaskAssignment);

      // Fetch user with role relation to check permissions
      // req.user from JWT doesn't include role relation by default
      const user = await userRepository.findOne({
        where: { id: req.userId },
        relations: ['role']
      });

      if (!user || !user.role) {
        res.status(403).json({
          success: false,
          message: 'Brak przypisanej roli użytkownika'
        });
        return;
      }

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

      // Worker może edytować tylko własne zadania
      if (user.role.name === 'worker') {
        const assignment = await assignmentRepository.findOne({
          where: {
            taskId: task.id,
            userId: user.id
          }
        });

        if (!assignment) {
          res.status(403).json({
            success: false,
            message: 'Możesz edytować tylko zadania, które są do Ciebie przypisane',
            code: 'TASK_NOT_ASSIGNED_TO_USER'
          });
          return;
        }
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

      // Wysłanie emaila o zakończeniu zadania (jeśli status to 'completed')
      if (status === 'completed') {
        try {
          const taskRepository = AppDataSource.getRepository(Task);
          const assignmentRepository = AppDataSource.getRepository(TaskAssignment);
          
          // Pobierz zadanie z relacjami
          const fullTask = await taskRepository.findOne({
            where: { taskNumber },
            relations: ['taskType']
          });

          if (fullTask) {
            // Znajdź przypisanych użytkowników i managerów
            const assignments = await assignmentRepository.find({
              where: { taskId: fullTask.id },
              relations: ['user']
            });

            const assignedEmails = assignments
              .map(a => a.user?.email)
              .filter(email => email && email.length > 0);

            // Znajdź managerów/adminów
            const userRepository = AppDataSource.getRepository(User);
            const managers = await userRepository.find({
              where: { active: true },
              relations: ['role']
            });

            const managerEmails = managers
              .filter(u => u.role && (u.role.name === 'admin' || u.role.name === 'manager'))
              .map(u => u.email)
              .filter(email => email && email.length > 0);

            // Połącz wszystkie unikalne adresy email
            const allEmails = [...new Set([...assignedEmails, ...managerEmails])];

            if (allEmails.length > 0) {
              await EmailQueueService.addToQueue({
                to: allEmails,
                subject: `Zadanie zakończone: ${fullTask.title} (#${fullTask.taskNumber})`,
                template: EmailTemplate.TASK_COMPLETED,
                context: {
                  taskNumber: fullTask.taskNumber,
                  taskName: fullTask.title,
                  taskType: fullTask.taskType?.name || 'Nieznany',
                  createdBy: req.user?.username || 'System',
                  location: fullTask.location || 'Nie określono',
                  status: 'Zakończone',
                  url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/tasks/${fullTask.taskNumber}`,
                },
              });
            }
          }
        } catch (emailError) {
          console.error('Błąd wysyłania emaila o zakończeniu zadania:', emailError);
          // Nie przerywamy procesu w przypadku błędu emaila
        }
      }

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
      const userRepository = AppDataSource.getRepository(User);

      const task = await taskRepository.findOne({
        where: { taskNumber, deletedAt: null as any },
        relations: ['taskType']
      });

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Zadanie nie znalezione'
        });
        return;
      }

      const assignments = [];
      const newAssignedUsers = [];
      
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
          
          // Pobierz dane użytkownika dla emaila
          const user = await userRepository.findOne({ where: { id: userId } });
          if (user) {
            newAssignedUsers.push(user);
          }
        }
      }

      // Wysyłka emaili do przypisanych użytkowników (asynchronicznie)
      try {
        for (const user of newAssignedUsers) {
          if (user.email) {
            await EmailQueueService.addToQueue({
              to: user.email,
              subject: `Przypisano Ci zadanie: ${task.title} (#${task.taskNumber})`,
              template: EmailTemplate.TASK_ASSIGNED,
              context: {
                taskNumber: task.taskNumber,
                taskName: task.title,
                taskType: task.taskType?.name || 'Nieznany',
                assignedBy: req.user?.username || 'System',
                location: task.location || 'Nie określono',
                priority: task.priority || 0,
                url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/tasks/${task.taskNumber}`,
              },
            });
          }
        }
      } catch (emailError) {
        console.error('Błąd wysyłania emaili o przypisaniu zadania:', emailError);
        // Nie przerywamy procesu w przypadku błędu emaila
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

  /**
   * GET /api/task-types
   * Pobierz wszystkie typy zadań
   */
  static async getTaskTypes(req: Request, res: Response): Promise<void> {
    try {
      const taskTypeRepository = AppDataSource.getRepository(TaskType);
      const taskTypes = await taskTypeRepository.find({
        where: { active: true },
        order: { name: 'ASC' }
      });

      res.json({
        success: true,
        data: taskTypes
      });
    } catch (error) {
      console.error('Błąd pobierania typów zadań:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }
}

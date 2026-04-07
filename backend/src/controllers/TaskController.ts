// src/controllers/TaskController.ts
// Kontroler zarządzania zadaniami

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Task } from '../entities/Task';
import { TaskType } from '../entities/TaskType';
import { TaskService } from '../services/TaskService';
import { TaskAssignment } from '../entities/TaskAssignment';
import { SubsystemTask, TaskWorkflowStatus } from '../entities/SubsystemTask';
import { TaskNumberGenerator } from '../services/TaskNumberGenerator';
import { PAGINATION } from '../config/constants';
import EmailQueueService from '../services/EmailQueueService';
import { EmailTemplate } from '../types/EmailTypes';
import { User } from '../entities/User';
import CompletionService from '../services/CompletionService';
import { CompletionOrder } from '../entities/CompletionOrder';
import { WorkflowGeneratedBom } from '../entities/WorkflowGeneratedBom';
import { TaskMaterial } from '../entities/TaskMaterial';
import { serverLogger } from '../utils/logger';

// Lista typów zadań, dla których NIE wolno zlecać wysyłki.
// Powinna odzwierciedlać konfigurację frontendową (NO_SHIPMENT_TYPES).
// Minimalnie blokujemy tworzenie wysyłki z innej wysyłki.
const NO_SHIPMENT_TYPES: string[] = ['KOMPLETACJA_WYSYLKI'];

// Typy zadań wymagające dodatkowego zadania kompletacji szafy
const CABINET_COMPLETION_TYPES: string[] = ['SKP', 'NASTAWNIA', 'LCS'];

/**
 * Generuje punkty kamerowe dla zadania na podstawie ilości słupów i typu zadania.
 * Dla SKP: S-KP-1, S-KP-2, ..., S-KP-10 (max 10)
 * Dla pozostałych (przejazd): PK-1, PK-2, ..., PK-10 (max 10)
 */
function generateCameraPoints(
  poleQuantity: number,
  taskType: string,
  poleType: string | null
): Array<{ id: number; name: string; poleType: string | null }> {
  const count = Math.min(Math.max(0, Math.floor(poleQuantity)), 10);
  if (count === 0) return [];

  const isSkp = taskType.toUpperCase() === 'SKP';
  const prefix = isSkp ? 'S-KP-' : 'PK-';

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${prefix}${i + 1}`,
    poleType: poleType || null,
  }));
}

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

      // FIXED: Dynamic sorting with proper field mapping
      // Use ENTITY property names (camelCase), NOT database column names (snake_case)
      const allowedSortFields = ['taskNumber', 'title', 'status', 'priority', 'createdAt', 'updatedAt', 'taskType', 'contractNumber'];
      const sortField = allowedSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
      const order = (sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      // Add contract join only when sorting by contractNumber
      if (sortField === 'contractNumber') {
        queryBuilder.leftJoinAndSelect('task.contract', 'contract');
      }
      
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

      // Sprawdź czy próbuje zmienić taskTypeId
      if (req.body.taskTypeId !== undefined && req.body.taskTypeId !== task.taskTypeId) {
        // Sprawdź czy zadanie ma BOM w metadata lub jest w zaawansowanym statusie
        const hasBom = task.metadata?.bomGenerated === true || task.metadata?.bomId;
        const advancedStatuses = ['configured', 'ready_for_completion', 'completed'];
        const isAdvanced = advancedStatuses.includes(task.status);

        if (hasBom || isAdvanced) {
          res.status(400).json({
            success: false,
            message: 'Nie można zmienić typu zadania po wygenerowaniu BOM lub gdy zadanie jest w zaawansowanym statusie',
            code: 'TASK_TYPE_CHANGE_BLOCKED',
            reason: hasBom ? 'BOM_EXISTS' : 'ADVANCED_STATUS'
          });
          return;
        }

        // Dodatkowo sprawdź w subsystem_tasks
        const subsystemTaskRepo = AppDataSource.getRepository(SubsystemTask);
        const subsystemTask = await subsystemTaskRepo.findOne({
          where: { taskNumber: task.taskNumber }
        });

        if (subsystemTask && (subsystemTask.bomGenerated || subsystemTask.bomId)) {
          res.status(400).json({
            success: false,
            message: 'Nie można zmienić typu zadania - BOM został wygenerowany dla tego zadania',
            code: 'TASK_TYPE_CHANGE_BLOCKED',
            reason: 'SUBSYSTEM_BOM_EXISTS'
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

      // Automatyczne tworzenie zlecenia kompletacji przy zmianie statusu na 'ready_for_completion'
      if (status === 'ready_for_completion') {
        try {
          const subsystemTaskRepository = AppDataSource.getRepository(SubsystemTask);
          const taskRepository = AppDataSource.getRepository(Task);
          const generatedBomRepository = AppDataSource.getRepository(WorkflowGeneratedBom);
          const taskMaterialRepository = AppDataSource.getRepository(TaskMaterial);

          let subsystemId: number | null = null;
          let bomId: number | null = null;

          // Resolve subsystemId – preferuj główną tabelę tasks
          const mainTask = await taskRepository.findOne({
            where: { taskNumber, deletedAt: null as any }
          });

          if (mainTask && mainTask.subsystemId) {
            subsystemId = mainTask.subsystemId;
          } else {
            // Fallback: szukaj w subsystem_tasks
            const subsystemTask = await subsystemTaskRepository.findOne({
              where: { taskNumber }
            });
            if (subsystemTask && subsystemTask.subsystemId) {
              subsystemId = subsystemTask.subsystemId;
              bomId = subsystemTask.bomId;
            }
          }

          if (subsystemId) {
            // Priorytet: nowy system BOM – sprawdź czy istnieją TaskMaterial
            const taskMaterials = await taskMaterialRepository.find({
              where: { taskId: task.id }
            });

            if (taskMaterials.length > 0) {
              await CompletionService.createCompletionOrderFromTaskMaterials({
                taskId: task.id,
                taskNumber,
                subsystemId,
                assignedToId: userId,
                taskMaterials
              });
              serverLogger.info(`Automatycznie utworzono zlecenie kompletacji z TaskMaterial dla zadania ${taskNumber}`);
            } else {
              // Fallback: stary system – WorkflowGeneratedBom
              if (!bomId && mainTask) {
                const generatedBom = await generatedBomRepository.findOne({
                  where: { subsystemId },
                  order: { generatedAt: 'DESC' }
                });
                if (generatedBom) {
                  bomId = generatedBom.id;
                }
              }

              if (bomId) {
                await CompletionService.createCompletionOrder({
                  subsystemId,
                  generatedBomId: bomId,
                  assignedToId: userId
                });
                serverLogger.info(`Automatycznie utworzono zlecenie kompletacji dla zadania ${taskNumber}`);
              } else {
                serverLogger.info(`Zadanie ${taskNumber} ma podsystem, ale nie posiada TaskMaterial ani WorkflowGeneratedBom – zlecenie kompletacji nie zostało utworzone`);
              }
            }
          } else {
            serverLogger.info(`Zadanie ${taskNumber} nie ma podsystemu – zlecenie kompletacji nie zostało utworzone`);
          }
        } catch (completionError: any) {
          // Jeżeli istnieje już zlecenie dla danego subsystemId (np. błąd unikalności),
          // traktujemy to jako sytuację idempotentną (no-op).
          const code = (completionError && (completionError.code || completionError.errno)) as string | undefined;
          const message = (completionError && completionError.message) as string | undefined;

          if (
            code === '23505' || // typowy kod błędu unikalności w PostgreSQL
            (message && message.toLowerCase().includes('duplicate key'))
          ) {
            serverLogger.info(
              `Zlecenie kompletacji dla zadania ${taskNumber} już istnieje – traktuję jako no-op`
            );
          } else {
            serverLogger.error(
              `Błąd tworzenia zlecenia kompletacji dla zadania ${taskNumber}: ${completionError?.message}`
            );
          }
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

  /**
   * POST /api/tasks/:taskNumber/request-shipment
   * Zleć wysyłkę materiałów podstawowych dla zadania podsystemu
   */
  static async requestShipment(req: Request, res: Response): Promise<void> {
    try {
      const { taskNumber } = req.params;
      const { deliveryAddress: rawDeliveryAddress, contactPhone: rawContactPhone, cabinetType, poleQuantity, poleType, poleProductInfo } = req.body;

      // Validate types
      if (typeof rawDeliveryAddress !== 'string' || typeof rawContactPhone !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Adres dostawy i telefon kontaktowy muszą być poprawnymi ciągami znaków'
        });
        return;
      }

      const deliveryAddress = rawDeliveryAddress.trim();
      const contactPhone = rawContactPhone.trim();

      // Validate non-empty after trimming
      if (!deliveryAddress || !contactPhone) {
        res.status(400).json({
          success: false,
          message: 'Adres dostawy i telefon kontaktowy są wymagane'
        });
        return;
      }

      const subsystemTaskRepository = AppDataSource.getRepository(SubsystemTask);
      const sourceTask = await subsystemTaskRepository.findOne({
        where: { taskNumber }
      });

      if (!sourceTask) {
        res.status(404).json({
          success: false,
          message: 'Zadanie nie znalezione'
        });
        return;
      }

      // Walidacja typu zadania źródłowego - nie wszystkie typy mogą zlecać wysyłkę
      if (NO_SHIPMENT_TYPES.includes(sourceTask.taskType)) {
        res.status(400).json({
          success: false,
          message: 'Nie można zlecić wysyłki dla tego typu zadania'
        });
        return;
      }

      // Blokada duplikatów - wysyłka już zlecona
      if (sourceTask.substatus === 'wysyłka_zlecona') {
        res.status(409).json({
          success: false,
          message: 'Wysyłka dla tego zadania została już zlecona'
        });
        return;
      }

      // Determine shipment task name based on source task type
      const INTERNAL_CABINET_TYPE = 'SZAFA_WEWNĘTRZNA';
      let shipmentTaskName: string;
      if (sourceTask.taskType === INTERNAL_CABINET_TYPE) {
        shipmentTaskName = 'Kompletacja szafy wewnętrznej';
      } else if (CABINET_COMPLETION_TYPES.includes(sourceTask.taskType.toUpperCase())) {
        shipmentTaskName = `Kompletacja wysyłki - ${sourceTask.taskType}`;
      } else {
        shipmentTaskName = 'Kompletacja szafy przejazdowej';
      }

      // Generate task numbers outside transaction (read-only)
      const newTaskNumber = await TaskNumberGenerator.generate();
      // Derive the cabinet task number by incrementing the sequence by 1.
      // We cannot call generate() twice because both calls see the same committed DB state
      // and would return the same number (the uncommitted newTask is not visible).
      const needsCabinetTask = CABINET_COMPLETION_TYPES.includes(sourceTask.taskType.toUpperCase());
      let cabinetTaskNumber: string | null = null;
      if (needsCabinetTask) {
        const match = newTaskNumber.match(/^Z(\d{4})(\d{4})$/);
        if (match) {
          const seq = parseInt(match[1], 10) + 1;
          if (seq > 9999) {
            throw new Error('Maksymalna liczba zadań (9999) osiągnięta dla bieżącego miesiąca');
          }
          cabinetTaskNumber = `Z${String(seq).padStart(4, '0')}${match[2]}`;
        } else {
          serverLogger.warn('Nie można wygenerować numeru zadania KOMPLETACJA_SZAF - nieoczekiwany format numeru zadania', {
            taskNumber,
            newTaskNumber,
            sourceTaskType: sourceTask.taskType,
          });
        }
      }

      // Atomically create shipment task and update source task substatus
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      let newTask: SubsystemTask;
      try {
        const taskRepo = queryRunner.manager.getRepository(SubsystemTask);

        // Create and save the new shipment task
        const newTaskEntity = taskRepo.create({
          subsystemId: sourceTask.subsystemId,
          taskNumber: newTaskNumber,
          taskName: shipmentTaskName,
          taskType: 'KOMPLETACJA_WYSYLKI',
          status: TaskWorkflowStatus.CREATED,
          substatus: null,
          // Metadata fields: deliveryAddress (string), contactPhone (string),
          // sourceTaskNumber (string) - reference to the originating task,
          // sourceTaskType (string) - task type of the originating task,
          // cabinetType (string | null) - typ szafy wybrany w kreatorze SMOKIP_B,
          // poleQuantity (number | null) - ilość słupów,
          // poleType (string | null) - rodzaj słupa (STALOWY/KOMPOZYT/INNY),
          // poleProductInfo (string | null) - info o produkcie "catalogNumber | materialName"
          metadata: {
            deliveryAddress,
            contactPhone,
            sourceTaskNumber: taskNumber,
            sourceTaskType: sourceTask.taskType,
            cabinetType: typeof cabinetType === 'string' ? cabinetType : null,
            poleQuantity: typeof poleQuantity === 'number' ? poleQuantity : null,
            poleType: typeof poleType === 'string' ? poleType : null,
            poleProductInfo: typeof poleProductInfo === 'string' ? poleProductInfo : null,
            cameraPoints: (typeof poleQuantity === 'number' && poleQuantity > 0)
              ? generateCameraPoints(poleQuantity, sourceTask.taskType, typeof poleType === 'string' ? poleType : null)
              : [],
          },
          bomGenerated: false,
          bomId: null,
          completionOrderId: null,
          completionStartedAt: null,
          completionCompletedAt: null,
          prefabricationTaskId: null,
          prefabricationStartedAt: null,
          prefabricationCompletedAt: null,
          deploymentScheduledAt: null,
          deploymentCompletedAt: null,
          verificationCompletedAt: null,
          realizationStartedAt: null,
          realizationCompletedAt: null,
        });
        newTask = await taskRepo.save(newTaskEntity);

        // Utwórz dodatkowe zadanie kompletacji szafy dla SKP, Nastawni i LCS
        if (needsCabinetTask && cabinetTaskNumber) {
          const cabinetTaskEntity = taskRepo.create({
            subsystemId: sourceTask.subsystemId,
            taskNumber: cabinetTaskNumber,
            taskName: `Kompletacja szafy - ${sourceTask.taskType}`,
            taskType: 'KOMPLETACJA_SZAF',
            status: TaskWorkflowStatus.CREATED,
            substatus: null,
            metadata: {
              sourceTaskNumber: taskNumber,
              sourceTaskType: sourceTask.taskType,
            },
            bomGenerated: false,
            bomId: null,
            completionOrderId: null,
            completionStartedAt: null,
            completionCompletedAt: null,
            prefabricationTaskId: null,
            prefabricationStartedAt: null,
            prefabricationCompletedAt: null,
            deploymentScheduledAt: null,
            deploymentCompletedAt: null,
            verificationCompletedAt: null,
            realizationStartedAt: null,
            realizationCompletedAt: null,
          });
          await taskRepo.save(cabinetTaskEntity);
        }

        // Update source task substatus (both column and metadata for frontend compatibility)
        sourceTask.substatus = 'wysyłka_zlecona';
        sourceTask.metadata = {
          ...sourceTask.metadata,
          substatus: 'wysyłka_zlecona',
          shipmentTaskNumber: newTask.taskNumber,
          shipmentRequestedAt: new Date().toISOString(),
        };
        await taskRepo.save(sourceTask);

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

      res.status(201).json({
        success: true,
        message: `Zadanie "${shipmentTaskName}" zostało utworzone`,
        data: newTask
      });
    } catch (error: any) {
      console.error('Błąd zlecania wysyłki:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Błąd serwera'
      });
    }
  }

  static async getTasksWithGps(req: Request, res: Response): Promise<void> {
    try {
      const taskRepository = AppDataSource.getRepository(Task);

      const tasks = await taskRepository
        .createQueryBuilder('task')
        .leftJoinAndSelect('task.taskType', 'taskType')
        .leftJoinAndSelect('task.contract', 'contract')
        .where('task.gpsLatitude IS NOT NULL')
        .andWhere('task.gpsLongitude IS NOT NULL')
        .andWhere('task.deletedAt IS NULL')
        .orderBy('task.createdAt', 'DESC')
        .getMany();

      res.json({
        success: true,
        data: tasks.map(task => ({
          id: task.id,
          taskNumber: task.taskNumber,
          title: task.title,
          status: task.status,
          location: task.location,
          gpsLatitude: task.gpsLatitude != null ? (isNaN(Number(task.gpsLatitude)) ? null : Number(task.gpsLatitude)) : null,
          gpsLongitude: task.gpsLongitude != null ? (isNaN(Number(task.gpsLongitude)) ? null : Number(task.gpsLongitude)) : null,
          googleMapsUrl: task.googleMapsUrl,
          taskType: task.taskType?.name,
          contractNumber: task.contract?.contractNumber
        }))
      });
    } catch (error: any) {
      serverLogger.error('Błąd pobierania zadań z GPS:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Błąd serwera'
      });
    }
  }
}

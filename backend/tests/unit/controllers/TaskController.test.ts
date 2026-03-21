// tests/unit/controllers/TaskController.test.ts
import { Request, Response } from 'express';
import { TaskController } from '../../../src/controllers/TaskController';
import { AppDataSource } from '../../../src/config/database';
import { Task } from '../../../src/entities/Task';
import { User } from '../../../src/entities/User';
import { TaskAssignment } from '../../../src/entities/TaskAssignment';
import { SubsystemTask } from '../../../src/entities/SubsystemTask';
import { TaskService } from '../../../src/services/TaskService';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';
import { createMockRepository, createMockQueryBuilder } from '../../mocks/database.mock';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../src/services/TaskService');
jest.mock('../../../src/services/EmailQueueService');

describe('TaskController', () => {
  let mockTaskRepository: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockTaskRepository = createMockRepository<Task>();
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockTaskRepository);
    
    req = createMockRequest();
    res = createMockResponse();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tasks', () => {
    it('should return paginated list of tasks', async () => {
      const mockTasks = [
        {
          id: 1,
          taskNumber: '123456789',
          title: 'Task 1',
          status: 'created',
          taskType: { id: 1, name: 'SMW' },
        },
        {
          id: 2,
          taskNumber: '987654321',
          title: 'Task 2',
          status: 'in_progress',
          taskType: { id: 1, name: 'SMW' },
        },
      ] as any;

      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockTasks, 2]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.query = { page: '1', limit: '20' };

      await TaskController.list(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockTasks,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1,
        },
      });
    });

    it('should filter tasks by status', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.query = { status: 'completed' };

      await TaskController.list(req as Request, res as Response);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('task.status = :status', { status: 'completed' });
    });

    it('should filter tasks by taskTypeId', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.query = { taskTypeId: '1' };

      await TaskController.list(req as Request, res as Response);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('task.task_type_id = :taskTypeId', { taskTypeId: '1' });
    });

    it('should search tasks by keyword', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.query = { search: 'test' };

      await TaskController.list(req as Request, res as Response);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('task.task_number LIKE :search'),
        { search: '%test%' }
      );
    });

    it('should sort tasks by specified field in ascending order', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.query = { sortBy: 'title', sortOrder: 'ASC' };

      await TaskController.list(req as Request, res as Response);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('task.title', 'ASC');
    });

    it('should sort tasks by specified field in descending order', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.query = { sortBy: 'status', sortOrder: 'DESC' };

      await TaskController.list(req as Request, res as Response);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('task.status', 'DESC');
    });

    it('should default to createdAt DESC when no sort parameters provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.query = {};

      await TaskController.list(req as Request, res as Response);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('task.createdAt', 'DESC');
    });

    it('should reject invalid sort field and default to createdAt', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.query = { sortBy: 'invalidField', sortOrder: 'ASC' };

      await TaskController.list(req as Request, res as Response);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('task.createdAt', 'ASC');
    });

    it('should sort tasks by taskNumber', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.query = { sortBy: 'taskNumber', sortOrder: 'ASC' };

      await TaskController.list(req as Request, res as Response);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('task.taskNumber', 'ASC');
    });

    it('should sort tasks by createdAt', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.query = { sortBy: 'createdAt', sortOrder: 'DESC' };

      await TaskController.list(req as Request, res as Response);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('task.createdAt', 'DESC');
    });

    it('should sort tasks by updatedAt', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.query = { sortBy: 'updatedAt', sortOrder: 'ASC' };

      await TaskController.list(req as Request, res as Response);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('task.updatedAt', 'ASC');
    });

    it('should sort tasks by taskType', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.query = { sortBy: 'taskType', sortOrder: 'ASC' };

      await TaskController.list(req as Request, res as Response);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('taskType.name', 'ASC');
    });

    it('should sort tasks by contractNumber', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.query = { sortBy: 'contractNumber', sortOrder: 'DESC' };

      await TaskController.list(req as Request, res as Response);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('task.contractNumber', 'DESC');
    });

    it('should return 500 on error', async () => {
      mockTaskRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error('Database error');
      });

      await TaskController.list(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd serwera',
      });
    });
  });

  describe('GET /api/tasks/:taskNumber', () => {
    it('should return task details for valid task number', async () => {
      const mockTask = {
        id: 1,
        taskNumber: '123456789',
        title: 'Test Task',
        status: 'created',
        taskType: { id: 1, name: 'SMW' },
      } as any;

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      req.params = { taskNumber: '123456789' };

      await TaskController.get(req as Request, res as Response);

      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: { taskNumber: '123456789', deletedAt: null },
        relations: expect.arrayContaining(['taskType', 'materials', 'activities']),
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockTask,
      });
    });

    it('should return 404 for non-existent task', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);
      req.params = { taskNumber: '999999999' };

      await TaskController.get(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Zadanie nie znalezione',
      });
    });

    it('should return 500 on error', async () => {
      mockTaskRepository.findOne.mockRejectedValue(new Error('Database error'));
      req.params = { taskNumber: '123456789' };

      await TaskController.get(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd serwera',
      });
    });
  });

  describe('update - taskTypeId validation', () => {
    let mockUserRepository: any;
    let mockAssignmentRepository: any;
    let mockSubsystemTaskRepository: any;

    const adminUser = {
      id: 1,
      role: { name: 'admin' },
    };

    beforeEach(() => {
      mockUserRepository = createMockRepository<User>();
      mockAssignmentRepository = createMockRepository<TaskAssignment>();
      mockSubsystemTaskRepository = createMockRepository<SubsystemTask>();

      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity === User) return mockUserRepository;
        if (entity === TaskAssignment) return mockAssignmentRepository;
        if (entity === SubsystemTask) return mockSubsystemTaskRepository;
        return mockTaskRepository;
      });

      mockUserRepository.findOne.mockResolvedValue(adminUser);
      mockSubsystemTaskRepository.findOne.mockResolvedValue(null);

      req = createMockRequest({ userId: 1 });
      req.params = { taskNumber: 'Z001' };
    });

    it('should block taskTypeId change when BOM exists in metadata (bomGenerated)', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z001',
        taskTypeId: 1,
        status: 'in_progress',
        metadata: { bomGenerated: true },
      } as any;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      req.body = { taskTypeId: 2 };

      await TaskController.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'TASK_TYPE_CHANGE_BLOCKED',
        reason: 'BOM_EXISTS',
      }));
    });

    it('should block taskTypeId change when BOM exists in metadata (bomId)', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z001',
        taskTypeId: 1,
        status: 'in_progress',
        metadata: { bomId: 42 },
      } as any;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      req.body = { taskTypeId: 2 };

      await TaskController.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'TASK_TYPE_CHANGE_BLOCKED',
        reason: 'BOM_EXISTS',
      }));
    });

    it('should block taskTypeId change when status is configured', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z001',
        taskTypeId: 1,
        status: 'configured',
        metadata: {},
      } as any;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      req.body = { taskTypeId: 2 };

      await TaskController.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'TASK_TYPE_CHANGE_BLOCKED',
        reason: 'ADVANCED_STATUS',
      }));
    });

    it('should block taskTypeId change when status is ready_for_completion', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z001',
        taskTypeId: 1,
        status: 'ready_for_completion',
        metadata: {},
      } as any;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      req.body = { taskTypeId: 2 };

      await TaskController.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'TASK_TYPE_CHANGE_BLOCKED',
        reason: 'ADVANCED_STATUS',
      }));
    });

    it('should block taskTypeId change when status is completed', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z001',
        taskTypeId: 1,
        status: 'completed',
        metadata: {},
      } as any;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      req.body = { taskTypeId: 2 };

      await TaskController.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'TASK_TYPE_CHANGE_BLOCKED',
        reason: 'ADVANCED_STATUS',
      }));
    });

    it('should block taskTypeId change when subsystem_tasks has bomGenerated', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z001',
        taskTypeId: 1,
        status: 'in_progress',
        metadata: {},
      } as any;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockSubsystemTaskRepository.findOne.mockResolvedValue({
        taskNumber: 'Z001',
        bomGenerated: true,
        bomId: null,
      });
      req.body = { taskTypeId: 2 };

      await TaskController.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'TASK_TYPE_CHANGE_BLOCKED',
        reason: 'SUBSYSTEM_BOM_EXISTS',
      }));
    });

    it('should block taskTypeId change when subsystem_tasks has bomId', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z001',
        taskTypeId: 1,
        status: 'in_progress',
        metadata: {},
      } as any;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockSubsystemTaskRepository.findOne.mockResolvedValue({
        taskNumber: 'Z001',
        bomGenerated: false,
        bomId: 10,
      });
      req.body = { taskTypeId: 2 };

      await TaskController.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        code: 'TASK_TYPE_CHANGE_BLOCKED',
        reason: 'SUBSYSTEM_BOM_EXISTS',
      }));
    });

    it('should allow taskTypeId change when no BOM and status is basic', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z001',
        taskTypeId: 1,
        status: 'created',
        metadata: {},
      } as any;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue({ ...mockTask, taskTypeId: 2 });
      mockSubsystemTaskRepository.findOne.mockResolvedValue(null);
      req.body = { taskTypeId: 2 };

      await TaskController.update(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });

    it('should allow taskTypeId change when in_progress and no BOM', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z001',
        taskTypeId: 1,
        status: 'in_progress',
        metadata: {},
      } as any;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue({ ...mockTask, taskTypeId: 2 });
      mockSubsystemTaskRepository.findOne.mockResolvedValue({
        taskNumber: 'Z001',
        bomGenerated: false,
        bomId: null,
      });
      req.body = { taskTypeId: 2 };

      await TaskController.update(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });

    it('should allow update when taskTypeId is unchanged', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z001',
        taskTypeId: 1,
        status: 'configured',
        metadata: { bomGenerated: true },
      } as any;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);
      req.body = { taskTypeId: 1, title: 'Updated title' };

      await TaskController.update(req as Request, res as Response);

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });
  });

  describe('myTasks', () => {
    it('should return tasks for the current user', async () => {
      const mockAssignmentRepository = createMockRepository<TaskAssignment>();
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity === TaskAssignment) return mockAssignmentRepository;
        return mockTaskRepository;
      });

      const mockTasks = [{ id: 1, taskNumber: 'T001', deletedAt: null }] as any[];
      mockAssignmentRepository.find = jest.fn().mockResolvedValue(
        mockTasks.map(t => ({ task: t }))
      );

      req = createMockRequest({ userId: 42 });

      await TaskController.myTasks(req as Request, res as Response);

      expect(mockAssignmentRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 42 } })
      );
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockTasks });
    });

    it('should return 500 on error', async () => {
      (AppDataSource.getRepository as jest.Mock).mockImplementation(() => {
        throw new Error('DB error');
      });

      req = createMockRequest({ userId: 1 });

      await TaskController.myTasks(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('create', () => {
    let mockUserRepository: any;
    let mockTaskTypeRepository: any;

    beforeEach(() => {
      mockUserRepository = createMockRepository<User>();
      mockTaskTypeRepository = createMockRepository();

      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity === User) return mockUserRepository;
        if (entity.name === 'TaskType' || entity === require('../../../src/entities/TaskType').TaskType) return mockTaskTypeRepository;
        return mockTaskRepository;
      });

      req = createMockRequest({ userId: 1 });
    });

    it('should return 403 when user has no role', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 1, role: null });
      req.body = { taskTypeId: 1 };

      await TaskController.create(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 when coordinator tries to create non-SERWIS task', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 1, role: { name: 'coordinator' } });
      mockTaskTypeRepository.findOne = jest.fn().mockResolvedValue({ id: 1, code: 'SMW', active: true });
      req.body = { taskTypeId: 1 };

      await TaskController.create(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, allowedTypes: ['SERWIS'] }));
    });

    it('should create task successfully for admin', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 1, role: { name: 'admin' } });
      const mockTask = { id: 1, taskNumber: 'T001', title: 'Test Task', taskType: { name: 'SMW' } };
      const { TaskService: MockTaskService } = require('../../../src/services/TaskService');
      MockTaskService.createTask = jest.fn().mockResolvedValue(mockTask);
      mockUserRepository.find = jest.fn().mockResolvedValue([]);

      req.body = { taskTypeId: 1, title: 'Test Task' };

      await TaskController.create(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('updateStatus', () => {
    it('should update task status successfully (200)', async () => {
      const mockTask = { id: 1, taskNumber: 'T001', status: 'in_progress' };
      const { TaskService: MockTaskService } = require('../../../src/services/TaskService');
      MockTaskService.updateTaskStatus = jest.fn().mockResolvedValue(mockTask);

      const mockTaskRepository2 = createMockRepository<Task>();
      const mockAssignmentRepository = createMockRepository<TaskAssignment>();
      mockTaskRepository2.findOne = jest.fn().mockResolvedValue(null);
      mockAssignmentRepository.find = jest.fn().mockResolvedValue([]);

      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockTaskRepository2);

      req = createMockRequest({ userId: 1 });
      req.params = { taskNumber: 'T001' };
      req.body = { status: 'in_progress' };

      await TaskController.updateStatus(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 500 when task not found', async () => {
      const { TaskService: MockTaskService } = require('../../../src/services/TaskService');
      MockTaskService.updateTaskStatus = jest.fn().mockRejectedValue(new Error('Zadanie nie znalezione'));

      req = createMockRequest({ userId: 1 });
      req.params = { taskNumber: 'NOTEXIST' };
      req.body = { status: 'in_progress' };

      await TaskController.updateStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('delete', () => {
    it('should soft-delete task and return 200', async () => {
      const mockTask = { id: 1, taskNumber: 'T001', deletedAt: null };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue({ ...mockTask, deletedAt: new Date() });

      req.params = { taskNumber: 'T001' };

      await TaskController.delete(req as Request, res as Response);

      expect(mockTaskRepository.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);
      req.params = { taskNumber: 'NOTEXIST' };

      await TaskController.delete(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('assign', () => {
    let mockAssignmentRepository: any;
    let mockUserRepository: any;

    beforeEach(() => {
      mockAssignmentRepository = createMockRepository<TaskAssignment>();
      mockUserRepository = createMockRepository<User>();

      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity === TaskAssignment) return mockAssignmentRepository;
        if (entity === User) return mockUserRepository;
        return mockTaskRepository;
      });
    });

    it('should assign users to task and return 200', async () => {
      const mockTask = { id: 1, taskNumber: 'T001', deletedAt: null, title: 'Test', taskType: { name: 'SMW' } };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockAssignmentRepository.findOne = jest.fn().mockResolvedValue(null);
      mockAssignmentRepository.create = jest.fn().mockReturnValue({ taskId: 1, userId: 2 });
      mockAssignmentRepository.save = jest.fn().mockResolvedValue({ taskId: 1, userId: 2 });
      mockUserRepository.findOne = jest.fn().mockResolvedValue({ id: 2, email: 'user@test.com' });

      req.params = { taskNumber: 'T001' };
      req.body = { userIds: [2] };
      req = { ...req, userId: 1 } as any;

      await TaskController.assign(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 404 when task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);
      req.params = { taskNumber: 'NOTEXIST' };
      req.body = { userIds: [1] };

      await TaskController.assign(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getTaskTypes', () => {
    it('should return all active task types', async () => {
      const mockTaskTypeRepository = createMockRepository();
      mockTaskTypeRepository.find = jest.fn().mockResolvedValue([
        { id: 1, name: 'SMW', code: 'SMW', active: true },
        { id: 2, name: 'SERWIS', code: 'SERWIS', active: true },
      ]);

      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockTaskTypeRepository);

      await TaskController.getTaskTypes(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'SMW' }),
        ]),
      });
    });

    it('should return empty array when no active task types', async () => {
      const mockTaskTypeRepository = createMockRepository();
      mockTaskTypeRepository.find = jest.fn().mockResolvedValue([]);
      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockTaskTypeRepository);

      await TaskController.getTaskTypes(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });
  });

  describe('getTasksWithGps', () => {
    it('should return tasks that have GPS coordinates', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      const mockTasks = [
        {
          id: 1, taskNumber: 'T001', title: 'GPS Task',
          status: 'in_progress', location: 'Warsaw',
          gpsLatitude: 52.2297, gpsLongitude: 21.0122,
          googleMapsUrl: 'https://maps.google.com/?q=52.2297,21.0122',
          taskType: { name: 'SMW' },
          contract: { contractNumber: 'R0000001_A' },
        },
      ] as any[];
      mockQueryBuilder.getMany.mockResolvedValue(mockTasks);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockTaskRepository);

      await TaskController.getTasksWithGps(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ gpsLatitude: 52.2297, gpsLongitude: 21.0122 }),
        ]),
      });
    });
  });
});

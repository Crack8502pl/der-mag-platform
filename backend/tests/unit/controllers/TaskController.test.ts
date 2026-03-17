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
});

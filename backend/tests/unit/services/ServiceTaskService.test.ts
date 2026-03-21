// tests/unit/services/ServiceTaskService.test.ts
import { ServiceTaskService } from '../../../src/services/ServiceTaskService';
import { AppDataSource } from '../../../src/config/database';
import { ServiceTask, ServiceTaskStatus, ServiceTaskVariant } from '../../../src/entities/ServiceTask';
import { ServiceTaskActivity } from '../../../src/entities/ServiceTaskActivity';
import { createMockRepository, createMockQueryBuilder } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock dynamic imports used in notifications
jest.mock('../../../src/services/BrigadeNotificationService', () => ({
  default: {
    notifyBrigadeChanged: jest.fn().mockResolvedValue(undefined),
    notifyTaskAssigned: jest.fn().mockResolvedValue(undefined),
    notifyPriorityChanged: jest.fn().mockResolvedValue(undefined),
    notifyMemberRemoved: jest.fn().mockResolvedValue(undefined),
  },
}), { virtual: true });

describe('ServiceTaskService', () => {
  let service: ServiceTaskService;
  let mockTaskRepository: any;
  let mockActivityRepository: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskRepository = createMockRepository<ServiceTask>();
    mockActivityRepository = createMockRepository<ServiceTaskActivity>();
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === ServiceTask || (entity && entity.name === 'ServiceTask')) {
        return mockTaskRepository;
      }
      return mockActivityRepository;
    });
    service = new ServiceTaskService();
  });

  describe('generateTaskNumber', () => {
    it('should return SRV-000001 when no tasks exist', async () => {
      const mockQb = createMockQueryBuilder<ServiceTask>();
      mockQb.getOne.mockResolvedValue(null);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.generateTaskNumber();

      expect(result).toBe('SRV-000001');
    });

    it('should increment from the last task number', async () => {
      const mockQb = createMockQueryBuilder<ServiceTask>();
      mockQb.getOne.mockResolvedValue({ taskNumber: 'SRV-000005' } as ServiceTask);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.generateTaskNumber();

      expect(result).toBe('SRV-000006');
    });

    it('should format with leading zeros', async () => {
      const mockQb = createMockQueryBuilder<ServiceTask>();
      mockQb.getOne.mockResolvedValue({ taskNumber: 'SRV-000099' } as ServiceTask);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.generateTaskNumber();

      expect(result).toBe('SRV-000100');
    });
  });

  describe('createTask', () => {
    it('should create a task with a generated task number', async () => {
      const mockQb = createMockQueryBuilder<ServiceTask>();
      mockQb.getOne.mockResolvedValue(null);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const mockTask = {
        id: 1,
        taskNumber: 'SRV-000001',
        title: 'Test Task',
        variant: ServiceTaskVariant.GWARANCYJNY,
        status: ServiceTaskStatus.CREATED,
      } as unknown as ServiceTask;
      mockTaskRepository.create.mockReturnValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      const result = await service.createTask({
        title: 'Test Task',
        variant: ServiceTaskVariant.GWARANCYJNY,
        createdById: 1,
      });

      expect(mockTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskNumber: 'SRV-000001',
          title: 'Test Task',
          variant: ServiceTaskVariant.GWARANCYJNY,
          status: ServiceTaskStatus.CREATED,
          createdById: 1,
        })
      );
      expect(result).toEqual(mockTask);
    });

    it('should set default priority and metadata when not provided', async () => {
      const mockQb = createMockQueryBuilder<ServiceTask>();
      mockQb.getOne.mockResolvedValue(null);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const mockTask = { id: 1 } as unknown as ServiceTask;
      mockTaskRepository.create.mockReturnValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      await service.createTask({
        title: 'Task',
        variant: ServiceTaskVariant.REKLAMACJA,
        createdById: 2,
      });

      expect(mockTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 0, metadata: {} })
      );
    });
  });

  describe('getTaskById', () => {
    it('should return task when found', async () => {
      const mockTask = { id: 1, taskNumber: 'SRV-000001' } as unknown as ServiceTask;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.getTaskById(1);

      expect(mockTaskRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 1 }) })
      );
      expect(result).toEqual(mockTask);
    });

    it('should return null when task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      const result = await service.getTaskById(999);

      expect(result).toBeNull();
    });
  });

  describe('getTaskByNumber', () => {
    it('should return task when found by task number', async () => {
      const mockTask = { id: 1, taskNumber: 'SRV-000001' } as unknown as ServiceTask;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.getTaskByNumber('SRV-000001');

      expect(mockTaskRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ taskNumber: 'SRV-000001' }) })
      );
      expect(result).toEqual(mockTask);
    });

    it('should return null when task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      const result = await service.getTaskByNumber('SRV-999999');

      expect(result).toBeNull();
    });
  });

  describe('getTasks', () => {
    function makeMockQb() {
      const mockQb = createMockQueryBuilder<ServiceTask>();
      (mockQb as any).addOrderBy = jest.fn().mockReturnThis();
      return mockQb;
    }

    it('should return tasks with default pagination', async () => {
      const mockTasks = [{ id: 1 }, { id: 2 }] as unknown as ServiceTask[];
      const mockQb = makeMockQb();
      mockQb.getManyAndCount.mockResolvedValue([mockTasks, 2]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getTasks();

      expect(result.tasks).toEqual(mockTasks);
      expect(result.total).toBe(2);
      expect(mockQb.skip).toHaveBeenCalledWith(0);
      expect(mockQb.take).toHaveBeenCalledWith(20);
    });

    it('should apply status filter', async () => {
      const mockQb = makeMockQb();
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getTasks({ status: ServiceTaskStatus.IN_PROGRESS });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'task.status = :status',
        { status: ServiceTaskStatus.IN_PROGRESS }
      );
    });

    it('should apply variant filter', async () => {
      const mockQb = makeMockQb();
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getTasks({ variant: ServiceTaskVariant.GWARANCYJNY });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'task.variant = :variant',
        { variant: ServiceTaskVariant.GWARANCYJNY }
      );
    });

    it('should apply pagination', async () => {
      const mockQb = makeMockQb();
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getTasks({ page: 2, limit: 10 });

      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('updateTask', () => {
    it('should update task and return updated task', async () => {
      const mockTask = {
        id: 1,
        title: 'Old Title',
        priority: 0,
        brigadeId: null,
        createdById: 1,
      } as unknown as ServiceTask;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      const updatedTask = { ...mockTask, title: 'New Title' } as unknown as ServiceTask;
      mockTaskRepository.save.mockResolvedValue(updatedTask);

      const result = await service.updateTask(1, { title: 'New Title' } as Partial<ServiceTask>);

      expect(mockTaskRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedTask);
    });

    it('should throw error when task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(service.updateTask(999, { title: 'Test' } as Partial<ServiceTask>)).rejects.toThrow(
        'Zadanie nie znalezione'
      );
    });
  });

  describe('updateStatus', () => {
    it('should update task status and log activity', async () => {
      const mockTask = {
        id: 1,
        status: ServiceTaskStatus.CREATED,
        actualStartDate: null,
        actualEndDate: null,
      } as unknown as ServiceTask;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue({ ...mockTask, status: ServiceTaskStatus.IN_PROGRESS });

      const mockActivity = { id: 1 } as unknown as ServiceTaskActivity;
      mockActivityRepository.create.mockReturnValue(mockActivity);
      mockActivityRepository.save.mockResolvedValue(mockActivity);

      const result = await service.updateStatus(1, ServiceTaskStatus.IN_PROGRESS, 5);

      expect(mockTaskRepository.save).toHaveBeenCalled();
      expect(mockActivityRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(ServiceTaskStatus.IN_PROGRESS);
    });

    it('should set actualStartDate when status changes to IN_PROGRESS', async () => {
      const mockTask = {
        id: 1,
        status: ServiceTaskStatus.CREATED,
        actualStartDate: null,
        actualEndDate: null,
      } as unknown as ServiceTask;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);
      mockActivityRepository.create.mockReturnValue({});
      mockActivityRepository.save.mockResolvedValue({});

      await service.updateStatus(1, ServiceTaskStatus.IN_PROGRESS, 1);

      expect(mockTask.actualStartDate).toBeDefined();
    });

    it('should set actualEndDate when status changes to COMPLETED', async () => {
      const mockTask = {
        id: 1,
        status: ServiceTaskStatus.IN_PROGRESS,
        actualStartDate: new Date(),
        actualEndDate: null,
      } as unknown as ServiceTask;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);
      mockActivityRepository.create.mockReturnValue({});
      mockActivityRepository.save.mockResolvedValue({});

      await service.updateStatus(1, ServiceTaskStatus.COMPLETED, 1);

      expect(mockTask.actualEndDate).toBeDefined();
    });

    it('should throw error when task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus(999, ServiceTaskStatus.COMPLETED, 1)
      ).rejects.toThrow('Zadanie nie znalezione');
    });
  });

  describe('deleteTask', () => {
    it('should soft delete task by setting deletedAt', async () => {
      const mockTask = { id: 1, deletedAt: null } as unknown as ServiceTask;
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue({ ...mockTask, deletedAt: new Date() });

      await service.deleteTask(1);

      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) })
      );
    });

    it('should throw error when task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteTask(999)).rejects.toThrow('Zadanie nie znalezione');
    });
  });
});

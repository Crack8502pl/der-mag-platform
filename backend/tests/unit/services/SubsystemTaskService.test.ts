// tests/unit/services/SubsystemTaskService.test.ts
import { SubsystemTaskService } from '../../../src/services/SubsystemTaskService';
import { AppDataSource } from '../../../src/config/database';
import { SubsystemTask, TaskWorkflowStatus } from '../../../src/entities/SubsystemTask';
import { Subsystem } from '../../../src/entities/Subsystem';
import { createMockRepository, createMockQueryBuilder } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../src/services/TaskNumberGenerator', () => ({
  TaskNumberGenerator: {
    generate: jest.fn().mockResolvedValue('Z00010125'),
  },
}));

jest.mock('../../../src/services/TaskSyncService', () => ({
  TaskSyncService: {
    syncFromSubsystemTask: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('SubsystemTaskService', () => {
  let service: SubsystemTaskService;
  let mockTaskRepository: any;
  let mockSubsystemRepository: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTaskRepository = createMockRepository<SubsystemTask>();
    mockSubsystemRepository = createMockRepository<Subsystem>();
    mockQueryBuilder = createMockQueryBuilder<SubsystemTask>();

    mockTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Subsystem) return mockSubsystemRepository;
      return mockTaskRepository;
    });

    service = new SubsystemTaskService();
  });

  describe('createTask', () => {
    it('should create a task for an existing subsystem', async () => {
      const mockSubsystem = { id: 1, subsystemNumber: 'P000010125' };
      mockSubsystemRepository.findOne.mockResolvedValue(mockSubsystem);

      const mockTask = {
        id: 1,
        taskNumber: 'Z00010125',
        taskName: 'Test Task',
        taskType: 'SMW',
        subsystemId: 1,
        status: TaskWorkflowStatus.CREATED,
      };
      mockTaskRepository.create.mockReturnValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      const result = await service.createTask({
        subsystemId: 1,
        taskName: 'Test Task',
        taskType: 'SMW',
      });

      expect(result).toEqual(mockTask);
      expect(mockTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskName: 'Test Task',
          taskType: 'SMW',
          subsystemId: 1,
          status: TaskWorkflowStatus.CREATED,
        })
      );
    });

    it('should throw when subsystem not found', async () => {
      mockSubsystemRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createTask({ subsystemId: 99, taskName: 'Test', taskType: 'SMW' })
      ).rejects.toThrow('Podsystem nie znaleziony');
    });
  });

  describe('updateStatus', () => {
    it('should update status of an existing task', async () => {
      const mockTask = { id: 1, taskNumber: 'Z00010125', status: TaskWorkflowStatus.CREATED };
      const updatedTask = { ...mockTask, status: TaskWorkflowStatus.BOM_GENERATED };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(updatedTask);

      const result = await service.updateStatus(1, TaskWorkflowStatus.BOM_GENERATED);

      expect(result.status).toBe(TaskWorkflowStatus.BOM_GENERATED);
    });

    it('should throw when task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(service.updateStatus(99, TaskWorkflowStatus.BOM_GENERATED)).rejects.toThrow(
        'Zadanie nie znalezione'
      );
    });
  });

  describe('updateStatusForSubsystem', () => {
    it('should update status for all tasks of a subsystem', async () => {
      const tasks = [
        { id: 1, taskNumber: 'Z00010125', status: TaskWorkflowStatus.CREATED, subsystemId: 1 },
        { id: 2, taskNumber: 'Z00020125', status: TaskWorkflowStatus.CREATED, subsystemId: 1 },
      ];
      mockTaskRepository.find.mockResolvedValue(tasks);
      mockTaskRepository.save.mockResolvedValue(undefined);

      await service.updateStatusForSubsystem(1, TaskWorkflowStatus.BOM_GENERATED);

      expect(mockTaskRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTasksBySubsystem', () => {
    it('should return all tasks for a subsystem', async () => {
      const tasks = [
        { id: 1, taskNumber: 'Z00010125', subsystemId: 1 },
        { id: 2, taskNumber: 'Z00020125', subsystemId: 1 },
      ];
      mockTaskRepository.find.mockResolvedValue(tasks);

      const result = await service.getTasksBySubsystem(1);
      expect(result).toHaveLength(2);
    });
  });

  describe('getTaskByNumber', () => {
    it('should return task by number', async () => {
      const mockTask = { id: 1, taskNumber: 'Z00010125' };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.getTaskByNumber('Z00010125');
      expect(result).toEqual(mockTask);
    });

    it('should return null when not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      const result = await service.getTaskByNumber('NOTEXIST');
      expect(result).toBeNull();
    });
  });

  describe('getTaskById', () => {
    it('should return task by id', async () => {
      const mockTask = { id: 1, taskNumber: 'Z00010125' };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.getTaskById(1);
      expect(result).toEqual(mockTask);
    });

    it('should return null when not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      const result = await service.getTaskById(99);
      expect(result).toBeNull();
    });
  });

  describe('generateTaskNumber (deprecated)', () => {
    it('should generate first task number for a subsystem', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.generateTaskNumber('P000010125');
      expect(result).toBe('P000010125-001');
    });

    it('should increment task sequence number', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ taskNumber: 'P000010125-003' });

      const result = await service.generateTaskNumber('P000010125');
      expect(result).toBe('P000010125-004');
    });

    it('should throw when max sequence exceeded', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ taskNumber: 'P000010125-999' });

      await expect(service.generateTaskNumber('P000010125')).rejects.toThrow(
        'Maksymalna liczba zadań (999)'
      );
    });
  });
});

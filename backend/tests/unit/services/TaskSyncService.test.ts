// tests/unit/services/TaskSyncService.test.ts
import { TaskSyncService } from '../../../src/services/TaskSyncService';
import { AppDataSource } from '../../../src/config/database';
import { Task } from '../../../src/entities/Task';
import { SubsystemTask, TaskWorkflowStatus } from '../../../src/entities/SubsystemTask';
import { createMockRepository } from '../../mocks/database.mock';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('TaskSyncService', () => {
  let mockTaskRepository: any;
  let mockSubsystemTaskRepository: any;

  beforeEach(() => {
    mockTaskRepository = createMockRepository<Task>();
    mockSubsystemTaskRepository = createMockRepository<SubsystemTask>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === Task || entity?.name === 'Task') return mockTaskRepository;
      if (entity === SubsystemTask || entity?.name === 'SubsystemTask') return mockSubsystemTaskRepository;
      return createMockRepository();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncFromTask', () => {
    it('should sync status from Task to SubsystemTask', async () => {
      const mockSubsystemTask = {
        id: 1,
        taskNumber: 'Z00130326',
        status: TaskWorkflowStatus.CREATED,
      };

      mockSubsystemTaskRepository.findOne.mockResolvedValue(mockSubsystemTask);
      mockSubsystemTaskRepository.save.mockResolvedValue(mockSubsystemTask);

      await TaskSyncService.syncFromTask('Z00130326', 'ready_for_completion');

      expect(mockSubsystemTaskRepository.findOne).toHaveBeenCalledWith({
        where: { taskNumber: 'Z00130326' },
      });
      expect(mockSubsystemTask.status).toBe(TaskWorkflowStatus.COMPLETION_ASSIGNED);
      expect(mockSubsystemTaskRepository.save).toHaveBeenCalled();
    });

    it('should not save if status is already the mapped value', async () => {
      const mockSubsystemTask = {
        id: 1,
        taskNumber: 'Z00130326',
        status: TaskWorkflowStatus.COMPLETION_ASSIGNED,
      };

      mockSubsystemTaskRepository.findOne.mockResolvedValue(mockSubsystemTask);

      await TaskSyncService.syncFromTask('Z00130326', 'ready_for_completion');

      expect(mockSubsystemTaskRepository.save).not.toHaveBeenCalled();
    });

    it('should handle missing SubsystemTask gracefully (no error)', async () => {
      mockSubsystemTaskRepository.findOne.mockResolvedValue(null);

      await expect(TaskSyncService.syncFromTask('Z00130326', 'completed')).resolves.toBeUndefined();
      expect(mockSubsystemTaskRepository.save).not.toHaveBeenCalled();
    });

    it('should handle unknown status mapping gracefully', async () => {
      const mockSubsystemTask = {
        id: 1,
        taskNumber: 'Z00130326',
        status: TaskWorkflowStatus.CREATED,
      };

      mockSubsystemTaskRepository.findOne.mockResolvedValue(mockSubsystemTask);

      await TaskSyncService.syncFromTask('Z00130326', 'unknown_status');

      expect(mockSubsystemTaskRepository.save).not.toHaveBeenCalled();
    });

    it('should catch errors and not throw (best effort)', async () => {
      mockSubsystemTaskRepository.findOne.mockRejectedValue(new Error('DB error'));

      await expect(TaskSyncService.syncFromTask('Z00130326', 'completed')).resolves.toBeUndefined();
    });
  });

  describe('syncFromSubsystemTask', () => {
    it('should sync status from SubsystemTask to Task', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z00130326',
        status: 'created',
        actualEndDate: null,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      await TaskSyncService.syncFromSubsystemTask('Z00130326', TaskWorkflowStatus.BOM_GENERATED);

      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: { taskNumber: 'Z00130326', deletedAt: null },
      });
      expect(mockTask.status).toBe('configured');
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it('should set actualEndDate when syncing to completed status', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z00130326',
        status: 'in_progress',
        actualEndDate: null,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      await TaskSyncService.syncFromSubsystemTask('Z00130326', TaskWorkflowStatus.COMPLETION_COMPLETED);

      expect(mockTask.status).toBe('completed');
      expect(mockTask.actualEndDate).toBeInstanceOf(Date);
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it('should not overwrite actualEndDate if already set', async () => {
      const existingEndDate = new Date('2024-01-15');
      const mockTask = {
        id: 1,
        taskNumber: 'Z00130326',
        status: 'in_progress',
        actualEndDate: existingEndDate,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      await TaskSyncService.syncFromSubsystemTask('Z00130326', TaskWorkflowStatus.CANCELLED);

      expect(mockTask.actualEndDate).toBe(existingEndDate);
    });

    it('should not save if status is already the mapped value', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z00130326',
        status: 'configured',
        actualEndDate: null,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      await TaskSyncService.syncFromSubsystemTask('Z00130326', TaskWorkflowStatus.BOM_GENERATED);

      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it('should handle missing Task gracefully (no error)', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(
        TaskSyncService.syncFromSubsystemTask('Z00130326', TaskWorkflowStatus.BOM_GENERATED)
      ).resolves.toBeUndefined();
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it('should catch errors and not throw (best effort)', async () => {
      mockTaskRepository.findOne.mockRejectedValue(new Error('DB error'));

      await expect(
        TaskSyncService.syncFromSubsystemTask('Z00130326', TaskWorkflowStatus.BOM_GENERATED)
      ).resolves.toBeUndefined();
    });
  });

  describe('syncBomId', () => {
    it('should sync bomId to task metadata', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z00130326',
        status: 'configured',
        metadata: { someKey: 'someValue' },
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      await TaskSyncService.syncBomId('Z00130326', 42);

      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: { taskNumber: 'Z00130326', deletedAt: null },
      });
      expect(mockTask.metadata).toEqual({
        someKey: 'someValue',
        bomId: 42,
        bomGenerated: true,
      });
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it('should set bomGenerated to false when bomId is null', async () => {
      const mockTask = {
        id: 1,
        taskNumber: 'Z00130326',
        status: 'configured',
        metadata: { bomId: 42, bomGenerated: true },
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      await TaskSyncService.syncBomId('Z00130326', null);

      expect(mockTask.metadata).toEqual({
        bomId: null,
        bomGenerated: false,
      });
    });

    it('should handle missing Task gracefully (no error)', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(TaskSyncService.syncBomId('Z00130326', 42)).resolves.toBeUndefined();
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it('should catch errors and not throw (best effort)', async () => {
      mockTaskRepository.findOne.mockRejectedValue(new Error('DB error'));

      await expect(TaskSyncService.syncBomId('Z00130326', 42)).resolves.toBeUndefined();
    });
  });
});

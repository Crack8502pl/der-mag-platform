// tests/unit/services/MetricsService.test.ts
import { MetricsService } from '../../../src/services/MetricsService';
import { AppDataSource } from '../../../src/config/database';
import { Task } from '../../../src/entities/Task';
import { TaskAssignment } from '../../../src/entities/TaskAssignment';
import { createMockRepository, createMockQueryBuilder } from '../../mocks/database.mock';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('MetricsService', () => {
  let mockTaskRepository: any;
  let mockAssignmentRepository: any;

  beforeEach(() => {
    mockTaskRepository = createMockRepository<Task>();
    mockAssignmentRepository = createMockRepository<TaskAssignment>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === Task || entity?.name === 'Task') return mockTaskRepository;
      if (entity === TaskAssignment || entity?.name === 'TaskAssignment') return mockAssignmentRepository;
      return createMockRepository();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      // Mock counts
      mockTaskRepository.count
        .mockResolvedValueOnce(100) // totalTasks
        .mockResolvedValueOnce(25)  // activeTasks
        .mockResolvedValueOnce(50); // completedTasks

      // Mock completed today query
      const mockQueryBuilder1 = createMockQueryBuilder<Task>();
      mockQueryBuilder1.getCount.mockResolvedValue(5);

      // Mock average completion time query
      const mockQueryBuilder2 = createMockQueryBuilder<Task>();
      mockQueryBuilder2.getRawOne.mockResolvedValue({ avg_seconds: 86400 }); // 24 hours in seconds

      mockTaskRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2);

      const result = await MetricsService.getDashboardStats();

      expect(result).toEqual({
        totalTasks: 100,
        activeTasks: 25,
        completedTasks: 50,
        completedToday: 5,
        averageCompletionTime: 24, // 86400 seconds / 3600 = 24 hours
      });

      expect(mockTaskRepository.count).toHaveBeenCalledTimes(3);
      expect(mockTaskRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
    });

    it('should handle zero tasks', async () => {
      mockTaskRepository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const mockQueryBuilder1 = createMockQueryBuilder<Task>();
      mockQueryBuilder1.getCount.mockResolvedValue(0);

      const mockQueryBuilder2 = createMockQueryBuilder<Task>();
      mockQueryBuilder2.getRawOne.mockResolvedValue(null);

      mockTaskRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2);

      const result = await MetricsService.getDashboardStats();

      expect(result).toEqual({
        totalTasks: 0,
        activeTasks: 0,
        completedTasks: 0,
        completedToday: 0,
        averageCompletionTime: 0,
      });
    });

    it('should handle missing average completion time', async () => {
      mockTaskRepository.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);

      const mockQueryBuilder1 = createMockQueryBuilder<Task>();
      mockQueryBuilder1.getCount.mockResolvedValue(1);

      const mockQueryBuilder2 = createMockQueryBuilder<Task>();
      mockQueryBuilder2.getRawOne.mockResolvedValue({ avg_seconds: null });

      mockTaskRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder1)
        .mockReturnValueOnce(mockQueryBuilder2);

      const result = await MetricsService.getDashboardStats();

      expect(result.averageCompletionTime).toBe(0);
    });
  });

  describe('getTaskTypeStats', () => {
    it('should return statistics grouped by task type', async () => {
      const mockStats = [
        {
          taskTypeName: 'SMW',
          count: '45',
          completed: '30',
        },
        {
          taskTypeName: 'LAN PKP PLK',
          count: '25',
          completed: '15',
        },
        {
          taskTypeName: 'CSDIP',
          count: '30',
          completed: '20',
        },
      ];

      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getRawMany.mockResolvedValue(mockStats);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await MetricsService.getTaskTypeStats();

      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.addSelect).toHaveBeenCalled();
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('task.taskType', 'task_type');
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('task_type.name');
      expect(result).toEqual(mockStats);
      expect(result).toHaveLength(3);
    });

    it('should return empty array if no tasks exist', async () => {
      const mockQueryBuilder = createMockQueryBuilder<Task>();
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockTaskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await MetricsService.getTaskTypeStats();

      expect(result).toEqual([]);
    });
  });
});

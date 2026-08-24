import { NotificationSchedulerService } from '../../../src/services/NotificationSchedulerService';
import { AppDataSource } from '../../../src/config/database';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));
jest.mock('../../../src/services/StockNotificationService', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../src/services/EmailQueueService', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../src/services/ContractNotificationService', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

describe('NotificationSchedulerService', () => {
  let service: NotificationSchedulerService;
  let mockTaskRepository: any;
  let mockContractRepository: any;
  let mockQueryBuilder: any;
  let mockContractQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    };

    mockContractQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    };

    mockTaskRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockContractRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockContractQueryBuilder),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      const name = typeof entity === 'function' ? entity.name : String(entity);
      if (name === 'Task') return mockTaskRepository;
      if (name === 'Contract') return mockContractRepository;
      return { count: jest.fn(), createQueryBuilder: jest.fn() };
    });

    service = new NotificationSchedulerService();
  });

  describe('getTaskStats', () => {
    it('should query plannedEndDate (not dueDate) for overdue count', async () => {
      mockTaskRepository.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);
      mockQueryBuilder.getCount.mockResolvedValue(1);

      await (service as any).getTaskStats();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'task.plannedEndDate < :now',
        expect.objectContaining({ now: expect.any(Date) })
      );
      expect((mockQueryBuilder.where as jest.Mock).mock.calls[0][0]).not.toContain('dueDate');
    });

    it('should return correct stats structure { total, active, completed, overdue }', async () => {
      mockTaskRepository.count
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4);
      mockQueryBuilder.getCount.mockResolvedValue(2);

      const result = await (service as any).getTaskStats();

      expect(result).toEqual({
        total: 12,
        active: 5,
        completed: 4,
        overdue: 2,
      });
    });

    it('should handle DB error gracefully', async () => {
      mockTaskRepository.count
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4);
      mockQueryBuilder.getCount.mockRejectedValue(new Error('DB error'));

      await expect((service as any).getTaskStats()).rejects.toThrow('DB error');
    });
  });

  describe('getWeeklyProgress', () => {
    it('should count completed tasks by completedAt and created tasks by createdAt', async () => {
      const weekStart = new Date('2026-08-17T06:00:00.038Z');
      const completedTasksQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValueOnce(7),
      };
      const createdTasksQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValueOnce(11),
      };

      mockTaskRepository.createQueryBuilder
        .mockReturnValueOnce(completedTasksQueryBuilder)
        .mockReturnValueOnce(createdTasksQueryBuilder);

      const result = await (service as any).getWeeklyProgress(weekStart);

      expect(result).toEqual({
        tasksCompleted: 7,
        tasksCreated: 11,
      });
      expect(mockTaskRepository.createQueryBuilder).toHaveBeenNthCalledWith(1, 'task');
      expect(completedTasksQueryBuilder.where).toHaveBeenCalledWith('task.completedAt >= :weekStart', { weekStart });
      expect(completedTasksQueryBuilder.andWhere).toHaveBeenCalledWith('task.status = :status', { status: 'completed' });
      expect(mockTaskRepository.createQueryBuilder).toHaveBeenNthCalledWith(2, 'task');
      expect(createdTasksQueryBuilder.where).toHaveBeenCalledWith('task.createdAt >= :weekStart', { weekStart });
    });
  });

  describe('getMonthlyMetrics', () => {
    it('should count contracts by createdAt and completed tasks by completedAt', async () => {
      const monthStart = new Date('2026-08-01T00:00:00.000Z');

      mockContractRepository.createQueryBuilder.mockReturnValueOnce(mockContractQueryBuilder);
      mockTaskRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder);
      mockContractQueryBuilder.getCount.mockResolvedValueOnce(4);
      mockQueryBuilder.getCount.mockResolvedValueOnce(9);

      const result = await (service as any).getMonthlyMetrics(monthStart);

      expect(result).toEqual({
        contractsCreated: 4,
        tasksCompleted: 9,
      });
      expect(mockContractRepository.createQueryBuilder).toHaveBeenCalledWith('contract');
      expect(mockContractQueryBuilder.where).toHaveBeenCalledWith('contract.createdAt >= :monthStart', { monthStart });
      expect(mockTaskRepository.createQueryBuilder).toHaveBeenCalledWith('task');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('task.completedAt >= :monthStart', { monthStart });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('task.status = :status', { status: 'completed' });
    });
  });
});

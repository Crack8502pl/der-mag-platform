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

describe('NotificationSchedulerService - getTaskStats', () => {
  let service: NotificationSchedulerService;
  let mockTaskRepository: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    };

    mockTaskRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      const name = typeof entity === 'function' ? entity.name : String(entity);
      if (name === 'Task') return mockTaskRepository;
      return { count: jest.fn(), createQueryBuilder: jest.fn() };
    });

    service = new NotificationSchedulerService();
  });

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

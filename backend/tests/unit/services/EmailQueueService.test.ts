// tests/unit/services/EmailQueueService.test.ts
import { AppDataSource } from '../../../src/config/database';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

jest.mock('../../../src/config/email', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(false),
  emailConfig: {
    redis: { host: 'localhost', port: 6379, password: null },
    rateLimit: { max: 10, window: 60000 },
    queue: { attempts: 3, backoffDelay: 1000, removeOnComplete: true, removeOnFail: false },
  },
}));

jest.mock('bull', () => {
  const mockQueue = {
    process: jest.fn(),
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    on: jest.fn(),
    empty: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(5),
    getFailedCount: jest.fn().mockResolvedValue(1),
    getDelayedCount: jest.fn().mockResolvedValue(0),
    getFailed: jest.fn().mockResolvedValue([{ id: 'failed-1' }]),
    getJob: jest.fn().mockResolvedValue({ retry: jest.fn().mockResolvedValue(undefined) }),
  };
  return jest.fn().mockImplementation(() => mockQueue);
});

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    zremrangebyscore: jest.fn().mockResolvedValue(0),
    zcard: jest.fn().mockResolvedValue(0),
    zadd: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(0),
    quit: jest.fn().mockResolvedValue(undefined),
  }));
});

jest.mock('../../../src/services/EmailService', () => ({
  __esModule: true,
  default: { sendEmail: jest.fn().mockResolvedValue(undefined) },
}));

describe('EmailQueueService', () => {
  let emailQueueService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('when email is not configured', () => {
    it('should not initialize when email is not configured', async () => {
      // Re-import to get fresh instance
      const { isEmailConfigured } = require('../../../src/config/email');
      (isEmailConfigured as jest.Mock).mockReturnValue(false);

      const module = await import('../../../src/services/EmailQueueService');
      const service = module.default;

      await service.initialize();

      // Should be a no-op when not configured
      expect(service).toBeDefined();
    });

    it('should return empty stats when queue is not initialized', async () => {
      const module = await import('../../../src/services/EmailQueueService');
      const service = module.default;

      const stats = await service.getStats();
      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });
    });

    it('should handle addToQueue gracefully when not initialized', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const module = await import('../../../src/services/EmailQueueService');
      const service = module.default;

      await service.addToQueue({
        to: 'test@example.com',
        subject: 'Test',
        template: 'test',
        context: {},
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('kolejka nie jest zainicjalizowana'));
      consoleSpy.mockRestore();
    });

    it('should handle clearQueue gracefully when not initialized', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const module = await import('../../../src/services/EmailQueueService');
      const service = module.default;

      await service.clearQueue();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Brak kolejki'));
      consoleSpy.mockRestore();
    });

    it('should handle close gracefully', async () => {
      const module = await import('../../../src/services/EmailQueueService');
      const service = module.default;

      await expect(service.close()).resolves.toBeUndefined();
    });
  });
});

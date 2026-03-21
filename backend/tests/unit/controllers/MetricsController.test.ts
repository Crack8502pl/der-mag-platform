// tests/unit/controllers/MetricsController.test.ts
import { Request, Response } from 'express';
import { MetricsController } from '../../../src/controllers/MetricsController';
import { MetricsService } from '../../../src/services/MetricsService';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

jest.mock('../../../src/services/MetricsService');

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('MetricsController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockRequest();
    res = createMockResponse();
  });

  describe('getDashboard', () => {
    it('should return dashboard stats', async () => {
      const mockStats = { totalTasks: 10, completedTasks: 5, pendingTasks: 5 };
      (MetricsService.getDashboardStats as jest.Mock).mockResolvedValue(mockStats);

      req = createMockRequest();

      await MetricsController.getDashboard(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockStats });
    });

    it('should return 500 on error', async () => {
      (MetricsService.getDashboardStats as jest.Mock).mockRejectedValue(new Error('DB error'));

      await MetricsController.getDashboard(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('getTaskTypeStats', () => {
    it('should return task type stats', async () => {
      const mockStats = [{ type: 'SMW', count: 5 }, { type: 'SRV', count: 3 }];
      (MetricsService.getTaskTypeStats as jest.Mock).mockResolvedValue(mockStats);

      await MetricsController.getTaskTypeStats(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockStats });
    });

    it('should return 500 on error', async () => {
      (MetricsService.getTaskTypeStats as jest.Mock).mockRejectedValue(new Error('DB error'));

      await MetricsController.getTaskTypeStats(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getUserStats', () => {
    it('should return user stats for given userId', async () => {
      const mockStats = { assignedTasks: 3, completedTasks: 1 };
      (MetricsService.getUserStats as jest.Mock).mockResolvedValue(mockStats);

      req = createMockRequest({ params: { userId: '7' } });

      await MetricsController.getUserStats(req as Request, res as Response);

      expect(MetricsService.getUserStats).toHaveBeenCalledWith(7);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockStats });
    });

    it('should return 500 on error', async () => {
      (MetricsService.getUserStats as jest.Mock).mockRejectedValue(new Error('DB error'));

      req = createMockRequest({ params: { userId: '7' } });

      await MetricsController.getUserStats(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getDailyStats', () => {
    it('should return daily stats with default 30 days', async () => {
      const mockStats = [{ date: '2024-01-01', count: 2 }];
      (MetricsService.getDailyStats as jest.Mock).mockResolvedValue(mockStats);

      req = createMockRequest({ query: {} });

      await MetricsController.getDailyStats(req as Request, res as Response);

      expect(MetricsService.getDailyStats).toHaveBeenCalledWith(30);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockStats });
    });

    it('should return daily stats with custom days parameter', async () => {
      const mockStats = [{ date: '2024-01-01', count: 1 }];
      (MetricsService.getDailyStats as jest.Mock).mockResolvedValue(mockStats);

      req = createMockRequest({ query: { days: '7' } });

      await MetricsController.getDailyStats(req as Request, res as Response);

      expect(MetricsService.getDailyStats).toHaveBeenCalledWith(7);
    });

    it('should return 500 on error', async () => {
      (MetricsService.getDailyStats as jest.Mock).mockRejectedValue(new Error('DB error'));

      req = createMockRequest({ query: {} });

      await MetricsController.getDailyStats(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

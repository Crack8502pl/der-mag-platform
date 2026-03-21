// tests/unit/controllers/ServiceTaskController.test.ts
import { Request, Response } from 'express';
import { ServiceTaskController } from '../../../src/controllers/ServiceTaskController';
import { ServiceTaskService } from '../../../src/services/ServiceTaskService';
import { ServiceTaskStatus, ServiceTaskVariant } from '../../../src/entities/ServiceTask';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

jest.mock('../../../src/services/ServiceTaskService');

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('ServiceTaskController', () => {
  let controller: ServiceTaskController;
  let mockServiceTaskService: jest.Mocked<ServiceTaskService>;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ServiceTaskController();
    mockServiceTaskService = (controller as any).serviceTaskService as jest.Mocked<ServiceTaskService>;
    req = createMockRequest();
    res = createMockResponse();
  });

  describe('createTask', () => {
    it('should create a task and return 201', async () => {
      const mockTask = { id: 1, taskNumber: 'SRV-000001', title: 'Test' };
      mockServiceTaskService.createTask = jest.fn().mockResolvedValue(mockTask);

      req = createMockRequest({
        user: { id: 1 },
        body: { title: 'Test Task', variant: ServiceTaskVariant.GWARANCYJNY },
      });

      await controller.createTask(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockTask })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      req = createMockRequest({ body: { title: 'Test', variant: ServiceTaskVariant.GWARANCYJNY } });

      await controller.createTask(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Unauthorized' })
      );
    });

    it('should return 400 when title is missing', async () => {
      req = createMockRequest({
        user: { id: 1 },
        body: { variant: ServiceTaskVariant.GWARANCYJNY },
      });

      await controller.createTask(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 400 when variant is missing', async () => {
      req = createMockRequest({
        user: { id: 1 },
        body: { title: 'Test Task' },
      });

      await controller.createTask(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on service error', async () => {
      mockServiceTaskService.createTask = jest.fn().mockRejectedValue(new Error('DB error'));

      req = createMockRequest({
        user: { id: 1 },
        body: { title: 'Test', variant: ServiceTaskVariant.GWARANCYJNY },
      });

      await controller.createTask(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  describe('getTasks', () => {
    it('should return tasks with pagination', async () => {
      const mockTasks = [{ id: 1 }, { id: 2 }];
      mockServiceTaskService.getTasks = jest.fn().mockResolvedValue({ tasks: mockTasks, total: 2 });

      req = createMockRequest({ query: { page: '1', limit: '20' } });

      await controller.getTasks(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockTasks,
          pagination: expect.objectContaining({ total: 2 }),
        })
      );
    });

    it('should apply status filter from query', async () => {
      mockServiceTaskService.getTasks = jest.fn().mockResolvedValue({ tasks: [], total: 0 });

      req = createMockRequest({ query: { status: ServiceTaskStatus.IN_PROGRESS } });

      await controller.getTasks(req as Request, res as Response);

      expect(mockServiceTaskService.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({ status: ServiceTaskStatus.IN_PROGRESS })
      );
    });

    it('should return 500 on service error', async () => {
      mockServiceTaskService.getTasks = jest.fn().mockRejectedValue(new Error('DB error'));

      req = createMockRequest({ query: {} });

      await controller.getTasks(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getTask', () => {
    it('should return task when found', async () => {
      const mockTask = { id: 1, taskNumber: 'SRV-000001' };
      mockServiceTaskService.getTaskById = jest.fn().mockResolvedValue(mockTask);

      req = createMockRequest({ params: { id: '1' } });

      await controller.getTask(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockTask })
      );
    });

    it('should return 404 when task not found', async () => {
      mockServiceTaskService.getTaskById = jest.fn().mockResolvedValue(null);

      req = createMockRequest({ params: { id: '999' } });

      await controller.getTask(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 500 on service error', async () => {
      mockServiceTaskService.getTaskById = jest.fn().mockRejectedValue(new Error('DB error'));

      req = createMockRequest({ params: { id: '1' } });

      await controller.getTask(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateTask', () => {
    it('should update task and return updated data', async () => {
      const mockTask = { id: 1, title: 'Updated' };
      mockServiceTaskService.updateTask = jest.fn().mockResolvedValue(mockTask);

      req = createMockRequest({ params: { id: '1' }, body: { title: 'Updated' } });

      await controller.updateTask(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockTask })
      );
    });

    it('should return 404 when task not found', async () => {
      mockServiceTaskService.updateTask = jest.fn().mockResolvedValue(null);

      req = createMockRequest({ params: { id: '999' }, body: { title: 'Updated' } });

      await controller.updateTask(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on service error', async () => {
      mockServiceTaskService.updateTask = jest.fn().mockRejectedValue(new Error('DB error'));

      req = createMockRequest({ params: { id: '1' }, body: {} });

      await controller.updateTask(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateStatus', () => {
    it('should update status and return task', async () => {
      const mockTask = { id: 1, status: ServiceTaskStatus.IN_PROGRESS };
      mockServiceTaskService.updateStatus = jest.fn().mockResolvedValue(mockTask);

      req = createMockRequest({
        user: { id: 1 },
        params: { id: '1' },
        body: { status: ServiceTaskStatus.IN_PROGRESS },
      });

      await controller.updateStatus(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockTask })
      );
    });

    it('should return 401 when unauthenticated', async () => {
      req = createMockRequest({ params: { id: '1' }, body: { status: 'in_progress' } });

      await controller.updateStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when status is missing', async () => {
      req = createMockRequest({ user: { id: 1 }, params: { id: '1' }, body: {} });

      await controller.updateStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on service error', async () => {
      mockServiceTaskService.updateStatus = jest.fn().mockRejectedValue(new Error('DB error'));

      req = createMockRequest({
        user: { id: 1 },
        params: { id: '1' },
        body: { status: ServiceTaskStatus.COMPLETED },
      });

      await controller.updateStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteTask', () => {
    it('should delete task and return success', async () => {
      mockServiceTaskService.deleteTask = jest.fn().mockResolvedValue(undefined);

      req = createMockRequest({ params: { id: '1' } });

      await controller.deleteTask(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 500 when task not found (service throws)', async () => {
      mockServiceTaskService.deleteTask = jest.fn().mockRejectedValue(new Error('Zadanie nie znalezione'));

      req = createMockRequest({ params: { id: '999' } });

      await controller.deleteTask(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('assignBrigade', () => {
    it('should assign brigade and return success', async () => {
      const mockTask = { id: 1, brigadeId: 5, status: 'ASSIGNED' };
      mockServiceTaskService.assignBrigade = jest.fn().mockResolvedValue(mockTask);
      req = createMockRequest({ user: { id: 1 } });
      req.params = { id: '1' };
      req.body = { brigadeId: 5 };

      await controller.assignBrigade(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: mockTask }));
    });

    it('should return 401 when not authenticated', async () => {
      req = createMockRequest({ user: undefined });
      req.params = { id: '1' };
      req.body = { brigadeId: 5 };

      await controller.assignBrigade(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when brigadeId is missing', async () => {
      req = createMockRequest({ user: { id: 1 } });
      req.params = { id: '1' };
      req.body = {};

      await controller.assignBrigade(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      const mockStats = { total: 10, byStatus: { CREATED: 5 }, byVariant: { INTERVENTION: 3 } };
      mockServiceTaskService.getStatistics = jest.fn().mockResolvedValue(mockStats);

      await controller.getStatistics(req as Request, res as Response);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: mockStats }));
    });
  });
});

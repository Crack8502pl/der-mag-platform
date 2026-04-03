// tests/unit/controllers/HealthController.test.ts
import { Request, Response } from 'express';
import { HealthController } from '../../../src/controllers/HealthController';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';

describe('HealthController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockRequest();
    res = createMockResponse();
  });

  // ────────────────────────────────────────────────────────────
  // ping
  // ────────────────────────────────────────────────────────────
  describe('ping', () => {
    it('should return 200 with success, timestamp, and server=ok', async () => {
      const before = Date.now();
      await HealthController.ping(req as Request, res as Response);
      const after = Date.now();

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonArg.success).toBe(true);
      expect(jsonArg.server).toBe('ok');
      expect(jsonArg.timestamp).toBeGreaterThanOrEqual(before);
      expect(jsonArg.timestamp).toBeLessThanOrEqual(after);
    });
  });

  // ────────────────────────────────────────────────────────────
  // health
  // ────────────────────────────────────────────────────────────
  describe('health', () => {
    it('should return 200 with status=healthy and uptime', async () => {
      await HealthController.health(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonArg.success).toBe(true);
      expect(jsonArg.status).toBe('healthy');
      expect(typeof jsonArg.uptime).toBe('number');
    });
  });

  // ────────────────────────────────────────────────────────────
  // speedTest
  // ────────────────────────────────────────────────────────────
  describe('speedTest', () => {
    it('should return 200 with octet-stream content for default size', async () => {
      req = createMockRequest({ query: {} });
      const setMock = jest.fn();
      (res as any).set = setMock;

      await HealthController.speedTest(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(setMock).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');

      // Default size is 1024 KB = 1 MB
      const sentData: Buffer = (res.send as jest.Mock).mock.calls[0][0];
      expect(sentData.length).toBe(1024 * 1024);
    });

    it('should respect the size query param', async () => {
      req = createMockRequest({ query: { size: '10' } });
      const setMock = jest.fn();
      (res as any).set = setMock;

      await HealthController.speedTest(req as Request, res as Response);

      const sentData: Buffer = (res.send as jest.Mock).mock.calls[0][0];
      expect(sentData.length).toBe(10 * 1024);
    });

    it('should clamp negative size to 1 KB', async () => {
      req = createMockRequest({ query: { size: '-500' } });
      const setMock = jest.fn();
      (res as any).set = setMock;

      await HealthController.speedTest(req as Request, res as Response);

      const sentData: Buffer = (res.send as jest.Mock).mock.calls[0][0];
      expect(sentData.length).toBe(1 * 1024); // clamped to minimum 1 KB
    });

    it('should clamp oversized request to 10 MB', async () => {
      req = createMockRequest({ query: { size: '99999' } });
      const setMock = jest.fn();
      (res as any).set = setMock;

      await HealthController.speedTest(req as Request, res as Response);

      const sentData: Buffer = (res.send as jest.Mock).mock.calls[0][0];
      expect(sentData.length).toBe(10 * 1024 * 1024); // clamped to 10 MB
    });

    it('should use default size (1024 KB) for a non-numeric size param', async () => {
      req = createMockRequest({ query: { size: 'abc' } });
      const setMock = jest.fn();
      (res as any).set = setMock;

      await HealthController.speedTest(req as Request, res as Response);

      const sentData: Buffer = (res.send as jest.Mock).mock.calls[0][0];
      expect(sentData.length).toBe(1024 * 1024);
    });

    it('should set Content-Length matching the buffer size', async () => {
      req = createMockRequest({ query: { size: '50' } });
      const setMock = jest.fn();
      (res as any).set = setMock;

      await HealthController.speedTest(req as Request, res as Response);

      const sentData: Buffer = (res.send as jest.Mock).mock.calls[0][0];
      expect(setMock).toHaveBeenCalledWith('Content-Length', sentData.length.toString());
    });
  });
});

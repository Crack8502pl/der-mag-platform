// tests/unit/controllers/PushController.test.ts
import { Request, Response } from 'express';
import { PushController } from '../../../src/controllers/PushController';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';

// Mock WebPushService
jest.mock('../../../src/services/WebPushService', () => ({
  __esModule: true,
  default: {
    validateEndpoint: jest.fn(),
    saveSubscription: jest.fn(),
    removeSubscription: jest.fn(),
    getSubscriptionStatus: jest.fn(),
  },
}));

import WebPushService from '../../../src/services/WebPushService';

const mockWebPushService = WebPushService as jest.Mocked<typeof WebPushService>;

describe('PushController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  const validSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test',
    expirationTime: null,
    keys: {
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockRequest({ userId: 1 });
    res = createMockResponse();
  });

  // ─── subscribe ───────────────────────────────────────────────────────────────

  describe('subscribe', () => {
    it('should return 401 if not authenticated', async () => {
      req = createMockRequest(); // no userId
      req.body = validSubscription;

      await PushController.subscribe(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should return 400 if endpoint is missing', async () => {
      req.body = { keys: { p256dh: 'x', auth: 'y' } };

      await PushController.subscribe(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should return 400 if keys are missing', async () => {
      req.body = { endpoint: 'https://fcm.googleapis.com/test' };

      await PushController.subscribe(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if endpoint is invalid (not an allowed service)', async () => {
      mockWebPushService.validateEndpoint.mockReturnValue(false);
      req.body = { ...validSubscription, endpoint: 'https://evil.com/push' };

      await PushController.subscribe(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should save subscription and return 200 on success', async () => {
      mockWebPushService.validateEndpoint.mockReturnValue(true);
      mockWebPushService.saveSubscription.mockResolvedValue(undefined);
      req.body = validSubscription;

      await PushController.subscribe(req as Request, res as Response);

      expect(mockWebPushService.saveSubscription).toHaveBeenCalledWith(1, validSubscription);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: expect.any(String) });
    });

    it('should return 500 when saveSubscription throws', async () => {
      mockWebPushService.validateEndpoint.mockReturnValue(true);
      mockWebPushService.saveSubscription.mockRejectedValue(new Error('DB error'));
      req.body = validSubscription;

      await PushController.subscribe(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── unsubscribe ─────────────────────────────────────────────────────────────

  describe('unsubscribe', () => {
    it('should return 401 if not authenticated', async () => {
      req = createMockRequest();
      req.body = { endpoint: validSubscription.endpoint };

      await PushController.unsubscribe(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should remove subscription and return 200', async () => {
      mockWebPushService.removeSubscription.mockResolvedValue(undefined);
      req.body = { endpoint: validSubscription.endpoint };

      await PushController.unsubscribe(req as Request, res as Response);

      expect(mockWebPushService.removeSubscription).toHaveBeenCalledWith(1, validSubscription.endpoint);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: expect.any(String) });
    });

    it('should return 500 when removeSubscription throws', async () => {
      mockWebPushService.removeSubscription.mockRejectedValue(new Error('DB error'));
      req.body = {};

      await PushController.unsubscribe(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getVapidPublicKey ───────────────────────────────────────────────────────

  describe('getVapidPublicKey', () => {
    it('should return 503 when VAPID key is not configured', async () => {
      delete process.env.VAPID_PUBLIC_KEY;

      await PushController.getVapidPublicKey(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should return the VAPID public key when configured', async () => {
      process.env.VAPID_PUBLIC_KEY = 'test-vapid-key';

      await PushController.getVapidPublicKey(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { vapidPublicKey: 'test-vapid-key' }
      });

      delete process.env.VAPID_PUBLIC_KEY;
    });
  });

  // ─── getStatus ───────────────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('should return 401 if not authenticated', async () => {
      req = createMockRequest();

      await PushController.getStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return subscription status with vapidConfigured flag', async () => {
      process.env.VAPID_PUBLIC_KEY = 'key';
      process.env.VAPID_PRIVATE_KEY = 'privkey';
      mockWebPushService.getSubscriptionStatus.mockResolvedValue({ subscribed: true, deviceCount: 2 });

      await PushController.getStatus(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { subscribed: true, deviceCount: 2, vapidConfigured: true }
      });

      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
    });

    it('should report vapidConfigured: false when keys are missing', async () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      mockWebPushService.getSubscriptionStatus.mockResolvedValue({ subscribed: false, deviceCount: 0 });

      await PushController.getStatus(req as Request, res as Response);

      const call = (res.json as jest.Mock).mock.calls[0][0];
      expect(call.data.vapidConfigured).toBe(false);
    });
  });
});

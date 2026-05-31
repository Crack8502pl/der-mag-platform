import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature } from '../../../src/middleware/webhookAuth';
import { serverLogger } from '../../../src/utils/logger';

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('verifyWebhookSignature middleware', () => {
  const originalEnv = process.env;

  const createReq = (overrides: Partial<Request> = {}): Request => ({
    headers: {},
    path: '/api/integrations/webhooks/test',
    ip: '127.0.0.1',
    ...overrides,
  } as unknown as Request);

  const createRes = (): Response => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: 'test', WEBHOOK_SECRET: 'webhook-secret-1234567890' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('passes request with valid HMAC signature', () => {
    const rawBody = Buffer.from(JSON.stringify({ event: 'order.created' }));
    const digest = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET as string).update(rawBody).digest('hex');

    const req = createReq({
      headers: { 'x-webhook-signature': `sha256=${digest}` },
      rawBody,
    } as any);
    const res = createRes();
    const next = jest.fn() as NextFunction;

    verifyWebhookSignature(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((res.status as jest.Mock)).not.toHaveBeenCalled();
  });

  it('rejects request without X-Webhook-Signature header', () => {
    const req = createReq({ rawBody: Buffer.from('{"ok":true}') } as any);
    const res = createRes();
    const next = jest.fn() as NextFunction;

    verifyWebhookSignature(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Missing webhook signature' });
  });

  it('rejects request with invalid HMAC signature', () => {
    const rawBody = Buffer.from(JSON.stringify({ event: 'order.created' }));
    const req = createReq({
      headers: { 'x-webhook-signature': 'sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
      rawBody,
    } as any);
    const res = createRes();
    const next = jest.fn() as NextFunction;

    verifyWebhookSignature(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid webhook signature' });
  });

  it('rejects request with invalid signature format (missing sha256=)', () => {
    const req = createReq({
      headers: { 'x-webhook-signature': 'deadbeef' },
      rawBody: Buffer.from('{"ok":true}'),
    } as any);
    const res = createRes();
    const next = jest.fn() as NextFunction;

    verifyWebhookSignature(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid signature format. Expected: sha256=<hex>',
    });
  });

  it('returns 500 in production when WEBHOOK_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WEBHOOK_SECRET;

    const req = createReq();
    const res = createRes();
    const next = jest.fn() as NextFunction;

    verifyWebhookSignature(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Webhook not configured' });
  });

  it('passes request in development when WEBHOOK_SECRET is missing', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.WEBHOOK_SECRET;

    const req = createReq();
    const res = createRes();
    const next = jest.fn() as NextFunction;

    verifyWebhookSignature(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((serverLogger.warn as jest.Mock)).toHaveBeenCalledWith(
      '[WEBHOOK] WEBHOOK_SECRET nie ustawiony — pomijam weryfikację (tylko development)'
    );
  });

  it('uses timingSafeEqual during signature verification', () => {
    const rawBody = Buffer.from(JSON.stringify({ event: 'order.created' }));
    const digest = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET as string).update(rawBody).digest('hex');
    const timingSafeEqualSpy = jest.spyOn(crypto, 'timingSafeEqual');

    const req = createReq({
      headers: { 'x-webhook-signature': `sha256=${digest}` },
      rawBody,
    } as any);
    const res = createRes();
    const next = jest.fn() as NextFunction;

    verifyWebhookSignature(req, res, next);

    expect(timingSafeEqualSpy).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    timingSafeEqualSpy.mockRestore();
  });
});

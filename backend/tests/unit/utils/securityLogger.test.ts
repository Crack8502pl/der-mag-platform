import { Request, Response, NextFunction } from 'express';
import { logSecurityEvent, sanitizeRequestForLog } from '../../../src/utils/securityLogger';
import { requestIdMiddleware } from '../../../src/middleware/requestId';
import { serverLogger } from '../../../src/utils/logger';

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('securityLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logSecurityEvent wywołuje serverLogger.error dla AUTH_BRUTE_FORCE_DETECTED', () => {
    logSecurityEvent({ type: 'AUTH_BRUTE_FORCE_DETECTED' });

    expect(serverLogger.error).toHaveBeenCalledWith(
      '[SECURITY] AUTH_BRUTE_FORCE_DETECTED',
      expect.objectContaining({ type: 'AUTH_BRUTE_FORCE_DETECTED', timestamp: expect.any(String) })
    );
  });

  it('logSecurityEvent wywołuje serverLogger.warn dla AUTH_LOGIN_FAILURE', () => {
    logSecurityEvent({ type: 'AUTH_LOGIN_FAILURE' });

    expect(serverLogger.warn).toHaveBeenCalledWith(
      '[SECURITY] AUTH_LOGIN_FAILURE',
      expect.objectContaining({ type: 'AUTH_LOGIN_FAILURE', timestamp: expect.any(String) })
    );
  });

  it('logSecurityEvent wywołuje serverLogger.info dla AUTH_LOGIN_SUCCESS', () => {
    logSecurityEvent({ type: 'AUTH_LOGIN_SUCCESS' });

    expect(serverLogger.info).toHaveBeenCalledWith(
      '[SECURITY] AUTH_LOGIN_SUCCESS',
      expect.objectContaining({ type: 'AUTH_LOGIN_SUCCESS', timestamp: expect.any(String) })
    );
  });

  it('logSecurityEvent dodaje timestamp jeśli brak', () => {
    logSecurityEvent({ type: 'ACCESS_DENIED' });

    const callArgs = (serverLogger.warn as jest.Mock).mock.calls[0][1];
    expect(callArgs.timestamp).toEqual(expect.any(String));
  });

  it('sanitizeRequestForLog redaktuje pole password', () => {
    const result = sanitizeRequestForLog({
      body: { password: 'super-secret' },
    });

    expect(result).toMatchObject({
      body: { password: '[REDACTED]' },
    });
  });

  it('sanitizeRequestForLog redaktuje pole token', () => {
    const result = sanitizeRequestForLog({
      body: { accessToken: 'jwt-token' },
    });

    expect(result).toMatchObject({
      body: { accessToken: '[REDACTED]' },
    });
  });

  it('sanitizeRequestForLog NIE redaktuje zwykłych pól', () => {
    const result = sanitizeRequestForLog({
      body: { email: 'user@example.com' },
    });

    expect(result).toMatchObject({
      body: { email: 'user@example.com' },
    });
  });
});

describe('requestIdMiddleware', () => {
  it('ustawia nagłówek X-Request-ID', () => {
    const req = { headers: {} } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toEqual(expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('używa istniejącego x-request-id z headera', () => {
    const req = { headers: { 'x-request-id': 'existing-request-id' } } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe('existing-request-id');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'existing-request-id');
    expect(next).toHaveBeenCalled();
  });
});

import { NextFunction, Request, Response } from 'express';

jest.mock('../../../src/services/HoneypotService', () => ({
  HoneypotService: {
    logHit: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { HoneypotService } from '../../../src/services/HoneypotService';
import { honeypotMiddleware } from '../../../src/middleware/honeypot';

describe('honeypotMiddleware - API tester trap', () => {
  const logHitMock = HoneypotService.logHit as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    logHitMock.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const createReq = (path: string, headers: Record<string, string> = {}): Request =>
    ({
      method: 'GET',
      path,
      headers,
      query: {},
      body: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request);

  const createRes = (): Response =>
    ({
      status: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as unknown as Response);

  const runMiddleware = (req: Request, res: Response) => {
    const next: NextFunction = jest.fn();
    honeypotMiddleware(req, res, next);
    jest.advanceTimersByTime(200);
    return next as jest.Mock;
  };

  it('GET /test/api-tester.html -> honeypot hit, api_tester_trap, status 200', () => {
    const req = createReq('/test/api-tester.html', { 'user-agent': 'Mozilla/5.0' });
    const res = createRes();

    const next = runMiddleware(req, res);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(logHitMock).toHaveBeenCalledWith(expect.objectContaining({
      path: '/test/api-tester.html',
      honeypotType: 'api_tester_trap',
      threatLevel: 'MEDIUM',
    }));
  });

  it('GET /test/api-tester.js -> honeypot hit and logged', () => {
    const req = createReq('/test/api-tester.js', { 'user-agent': 'Mozilla/5.0' });
    const res = createRes();

    runMiddleware(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(logHitMock).toHaveBeenCalledWith(expect.objectContaining({
      path: '/test/api-tester.js',
      honeypotType: 'api_tester_trap',
    }));
  });

  it('GET /api-tester -> honeypot hit and logged', () => {
    const req = createReq('/api-tester', { 'user-agent': 'Mozilla/5.0' });
    const res = createRes();

    runMiddleware(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(logHitMock).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api-tester',
      honeypotType: 'api_tester_trap',
    }));
  });

  it('GET /test -> honeypot hit and logged', () => {
    const req = createReq('/test', { 'user-agent': 'Mozilla/5.0' });
    const res = createRes();

    runMiddleware(req, res);

    expect(res.status).toHaveBeenCalledWith(301);
    expect(logHitMock).toHaveBeenCalledWith(expect.objectContaining({
      path: '/test',
      honeypotType: 'api_tester_trap',
    }));
  });

  it('does not log sensitive authorization headers', () => {
    const req = createReq('/test/api-tester.js', {
      'user-agent': 'Mozilla/5.0',
      authorization: 'Token test-token',
      cookie: 'refreshToken=abc123',
      'x-api-key': 'secret-key',
      'x-custom-header': 'safe-value',
    });
    const res = createRes();

    runMiddleware(req, res);

    expect(logHitMock).toHaveBeenCalledWith(expect.objectContaining({
      headers: expect.objectContaining({
        'user-agent': 'Mozilla/5.0',
        'x-custom-header': 'safe-value',
      }),
    }));

    const payload = logHitMock.mock.calls[0][0];
    expect(payload.headers.authorization).toBeUndefined();
    expect(payload.headers.cookie).toBeUndefined();
    expect(payload.headers['x-api-key']).toBeUndefined();
  });
});

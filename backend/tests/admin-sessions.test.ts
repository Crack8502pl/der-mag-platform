import { Request, Response } from 'express';
import { AuthController } from '../src/controllers/AuthController';
import { AdminSessionsController } from '../src/controllers/AdminSessionsController';
import { AppDataSource } from '../src/config/database';
import { User } from '../src/entities/User';
import { RefreshToken } from '../src/entities/RefreshToken';
import { UserSessionLog } from '../src/entities/UserSessionLog';
import { createMockRequest, createMockResponse } from './mocks/request.mock';

jest.mock('../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      hasTable: jest.fn().mockResolvedValue(true),
      release: jest.fn(),
      query: jest.fn(),
    })),
  },
}));

jest.mock('../src/config/jwt', () => ({
  generateAccessToken: jest.fn((payload: any, tokenId: string) => `access-${payload.userId}-${tokenId}`),
  generateRefreshToken: jest.fn((payload: any, tokenId: string) => `refresh-${payload.userId}-${tokenId}`),
  verifyRefreshToken: jest.fn((token: string) => {
    const tokenId = token.split('-').slice(2).join('-');
    return { jti: tokenId, userId: 1, username: 'jan', role: 'admin' };
  }),
  decodeToken: jest.fn((token: string) => {
    if (!token) return null;
    const tokenId = token.split('-').slice(2).join('-');
    return { jti: tokenId, userId: 1, username: 'jan', role: 'admin' };
  }),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

jest.mock('../src/services/EmailService', () => ({
  __esModule: true,
  default: { sendPasswordChangedEmail: jest.fn(), initialize: jest.fn() },
}));

jest.mock('../src/services/NotificationService', () => ({
  NotificationService: { sendPasswordResetEmail: jest.fn() },
}));

describe('Admin sessions lifecycle and history', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('login -> multiple refresh -> logout keeps one session_log entry with original loginAt and duration', async () => {
    const { v4: uuidv4 } = require('uuid');
    (uuidv4 as jest.Mock)
      .mockReturnValueOnce('tok-login')
      .mockReturnValueOnce('tok-r1')
      .mockReturnValueOnce('tok-r2');

    const refreshTokens: any[] = [];
    const sessionLogs: any[] = [];
    const loginAt = new Date(Date.now() - 5000);

    const user = {
      id: 1,
      username: 'jan',
      email: 'jan@example.com',
      firstName: 'Jan',
      lastName: 'Kowalski',
      active: true,
      role: { name: 'admin' },
      validatePassword: jest.fn().mockResolvedValue(true),
    };

    const userRepo = {
      createQueryBuilder: jest.fn(() => ({
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      })),
      save: jest.fn().mockResolvedValue(user),
    };

    const refreshTokenRepo = {
      create: jest.fn((data: any) => ({
        ...data,
        createdAt: new Date(),
        revoked: data.revoked ?? false,
        revokedAt: data.revokedAt ?? null,
        revokedByTokenId: data.revokedByTokenId ?? null,
      })),
      save: jest.fn(async (data: any) => {
        const idx = refreshTokens.findIndex(t => t.tokenId === data.tokenId);
        if (idx >= 0) refreshTokens[idx] = { ...refreshTokens[idx], ...data };
        else refreshTokens.push({ ...data });
        return data;
      }),
      findOne: jest.fn(async ({ where }: any) => (
        refreshTokens.find(t => t.tokenId === where.tokenId) || null
      )),
      find: jest.fn(async () => []),
      update: jest.fn(async ({ tokenId }: any, updateData: any) => {
        const token = refreshTokens.find(t => t.tokenId === tokenId && t.revoked === false);
        if (token) Object.assign(token, updateData);
        return { affected: token ? 1 : 0 };
      }),
    };

    const sessionLogRepo = {
      create: jest.fn((data: any) => ({
        id: sessionLogs.length + 1,
        loginAt: sessionLogs.length === 0 ? loginAt : new Date(),
        ...data,
      })),
      save: jest.fn(async (data: any) => {
        const idx = sessionLogs.findIndex(l => l.id === data.id || l.tokenId === data.tokenId);
        if (idx >= 0) sessionLogs[idx] = { ...sessionLogs[idx], ...data };
        else sessionLogs.push({ ...data });
        return data;
      }),
      findOne: jest.fn(async ({ where }: any) => (
        sessionLogs.find(l => l.tokenId === where.tokenId) || null
      )),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === User || entity?.name === 'User') return userRepo;
      if (entity === RefreshToken || entity?.name === 'RefreshToken') return refreshTokenRepo;
      if (entity === UserSessionLog || entity?.name === 'UserSessionLog') return sessionLogRepo;
      return {};
    });

    const loginReq = createMockRequest({
      body: { username: 'jan', password: 'secret' },
      headers: { 'user-agent': 'Chrome' },
    });
    const loginRes = createMockResponse();
    await AuthController.login(loginReq as Request, loginRes as Response);

    let currentRefreshCookie = (loginRes.cookie as jest.Mock).mock.calls.find(c => c[0] === 'refreshToken')?.[1];
    expect(currentRefreshCookie).toBeDefined();

    for (let i = 0; i < 2; i++) {
      const refreshReq = createMockRequest({
        cookies: { refreshToken: currentRefreshCookie },
        headers: { 'user-agent': i === 0 ? 'Chrome' : 'Firefox' },
      });
      const refreshRes = createMockResponse();
      await AuthController.refresh(refreshReq as Request, refreshRes as Response);
      currentRefreshCookie = (refreshRes.cookie as jest.Mock).mock.calls.find(c => c[0] === 'refreshToken')?.[1];
    }

    const logoutReq = createMockRequest({ cookies: { refreshToken: currentRefreshCookie } });
    const logoutRes = createMockResponse();
    await AuthController.logout(logoutReq as Request, logoutRes as Response);

    expect(sessionLogs).toHaveLength(1);
    expect(sessionLogs[0].tokenId).toBe('tok-r2');
    expect(sessionLogs[0].loginAt).toEqual(loginAt);
    expect(sessionLogs[0].durationSeconds).not.toBeNull();
  });

  const prepareHistoryResponse = async () => {
    const now = new Date();
    const janLogin1 = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const janLogin2 = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const kasiaLogin1 = new Date(now.getTime() - 31 * 1000);
    const kasiaLogin2 = new Date(now.getTime() - 16 * 1000);

    const allLogs = [
      {
        id: 1,
        userId: 1,
        tokenId: 'jan-1',
        loginAt: janLogin1,
        logoutAt: new Date(janLogin1.getTime() + 8 * 60 * 60 * 1000),
        durationSeconds: 28800,
        ipAddress: '10.0.0.1',
        lastIpAddress: '10.0.0.1',
        userAgent: 'Chrome',
        lastUserAgent: 'Chrome',
        logoutType: 'manual',
        user: { username: 'jan', firstName: 'Jan', lastName: 'Kowalski', email: 'jan@example.com', role: { name: 'admin' } },
      },
      {
        id: 2,
        userId: 1,
        tokenId: 'jan-2',
        loginAt: janLogin2,
        logoutAt: new Date(janLogin2.getTime() + 4 * 60 * 60 * 1000),
        durationSeconds: 14400,
        ipAddress: '10.0.0.1',
        lastIpAddress: '10.0.0.2',
        userAgent: 'Chrome',
        lastUserAgent: 'Firefox',
        logoutType: 'manual',
        user: { username: 'jan', firstName: 'Jan', lastName: 'Kowalski', email: 'jan@example.com', role: { name: 'admin' } },
      },
      {
        id: 3,
        userId: 2,
        tokenId: 'kasia-1',
        loginAt: kasiaLogin1,
        logoutAt: new Date(kasiaLogin1.getTime() + 15000),
        durationSeconds: 15,
        ipAddress: '10.0.0.5',
        lastIpAddress: '10.0.0.5',
        userAgent: 'Safari',
        lastUserAgent: 'Safari',
        logoutType: 'manual',
        user: { username: 'kasia', firstName: 'Katarzyna', lastName: 'Nowak', email: 'kasia@example.com', role: { name: 'user' } },
      },
      {
        id: 4,
        userId: 2,
        tokenId: 'kasia-2',
        loginAt: kasiaLogin2,
        logoutAt: new Date(kasiaLogin2.getTime() + 16000),
        durationSeconds: 16,
        ipAddress: '10.0.0.5',
        lastIpAddress: '10.0.0.5',
        userAgent: 'Safari',
        lastUserAgent: 'Safari',
        logoutType: 'manual',
        user: { username: 'kasia', firstName: 'Katarzyna', lastName: 'Nowak', email: 'kasia@example.com', role: { name: 'user' } },
      },
    ];

    const sessionLogRepo = {
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(allLogs),
      })),
    };
    const refreshTokenRepo = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === UserSessionLog || entity?.name === 'UserSessionLog') return sessionLogRepo;
      if (entity === RefreshToken || entity?.name === 'RefreshToken') return refreshTokenRepo;
      return {};
    });

    const req = createMockRequest();
    const res = createMockResponse();
    await AdminSessionsController.getSessionHistory(req as Request, res as Response);
    return (res.json as jest.Mock).mock.calls[0][0];
  };

  it('history endpoint groups data by user', async () => {
    const responseBody = await prepareHistoryResponse();
    const jan = responseBody.data.users.find((u: any) => u.username === 'jan');
    const kasia = responseBody.data.users.find((u: any) => u.username === 'kasia');

    expect(jan.totalDurationSeconds).toBe(43200);
    expect(jan.sessionCount).toBe(2);
    expect(kasia.totalDurationSeconds).toBe(31);
    expect(kasia.sessionCount).toBe(2);
  });

  it('history endpoint detects IP/UA changes', async () => {
    const responseBody = await prepareHistoryResponse();
    const jan = responseBody.data.users.find((u: any) => u.username === 'jan');
    expect(jan.sessions.some((s: any) => s.ipChanged && s.uaChanged)).toBe(true);
  });

  it('history endpoint marks offline users as not active', async () => {
    const responseBody = await prepareHistoryResponse();
    const jan = responseBody.data.users.find((u: any) => u.username === 'jan');
    const kasia = responseBody.data.users.find((u: any) => u.username === 'kasia');
    expect(jan.isCurrentlyActive).toBe(false);
    expect(kasia.isCurrentlyActive).toBe(false);
  });

  it('admin forced logout sets logoutType = admin_forced', async () => {
    const tokenRecord = { tokenId: 'tok-admin', userId: 7, revoked: false, revokedAt: null };
    const logRecord = { tokenId: 'tok-admin', loginAt: new Date(Date.now() - 1000), logoutAt: null, durationSeconds: null, logoutType: null };

    const refreshTokenRepo = {
      findOne: jest.fn().mockResolvedValue(tokenRecord),
      save: jest.fn().mockResolvedValue(tokenRecord),
    };
    const sessionLogRepo = {
      findOne: jest.fn().mockResolvedValue(logRecord),
      save: jest.fn().mockImplementation(async (record: any) => record),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === RefreshToken || entity?.name === 'RefreshToken') return refreshTokenRepo;
      if (entity === UserSessionLog || entity?.name === 'UserSessionLog') return sessionLogRepo;
      return {};
    });

    const req = createMockRequest({ userId: 99, params: { tokenId: 'tok-admin' }, headers: {} });
    const res = createMockResponse();
    await AdminSessionsController.forceLogout(req as Request, res as Response);

    expect(sessionLogRepo.save).toHaveBeenCalledWith(expect.objectContaining({ logoutType: 'admin_forced' }));
  });
});

// tests/unit/controllers/AdminSessionsController.test.ts
import { Request, Response } from 'express';
import { AdminSessionsController } from '../../../src/controllers/AdminSessionsController';
import { AppDataSource } from '../../../src/config/database';
import { RefreshToken } from '../../../src/entities/RefreshToken';
import { UserSessionLog } from '../../../src/entities/UserSessionLog';
import { User } from '../../../src/entities/User';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';
import { createMockRepository, createMockQueryBuilder } from '../../mocks/database.mock';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      hasTable: jest.fn().mockResolvedValue(false),
      release: jest.fn(),
      query: jest.fn(),
    })),
  },
}));

jest.mock('../../../src/config/jwt', () => ({
  decodeToken: jest.fn(),
}));

import * as jwt from '../../../src/config/jwt';

describe('AdminSessionsController', () => {
  let mockRefreshTokenRepository: any;
  let mockSessionLogRepository: any;
  let mockUserRepository: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day from now
  const pastDate = new Date(Date.now() - 1000 * 60 * 30); // 30 min ago
  const now = new Date();

  const mockUser = {
    id: 1,
    username: 'jankowalski',
    firstName: 'Jan',
    lastName: 'Kowalski',
    email: 'jan@example.com',
    role: { id: 1, name: 'admin' },
    lastLogin: new Date(),
    active: true,
  };

  const mockToken = {
    id: 1,
    tokenId: 'token-uuid-1234',
    userId: 1,
    user: mockUser,
    createdAt: pastDate,
    expiresAt: futureDate,
    revoked: false,
    revokedAt: null,
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120',
    rememberMe: false,
  };

  const mockSessionLog = {
    id: 1,
    tokenId: 'token-uuid-1234',
    userId: 1,
    loginAt: pastDate,
    logoutAt: null,
    durationSeconds: null,
    logoutType: null,
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
  };

  beforeEach(() => {
    mockRefreshTokenRepository = createMockRepository<RefreshToken>();
    mockSessionLogRepository = createMockRepository<UserSessionLog>();
    mockUserRepository = createMockRepository<User>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      const name = entity?.name || entity;
      if (name === 'RefreshToken' || entity === RefreshToken) return mockRefreshTokenRepository;
      if (name === 'UserSessionLog' || entity === UserSessionLog) return mockSessionLogRepository;
      if (name === 'User' || entity === User) return mockUserRepository;
      return createMockRepository();
    });

    req = createMockRequest({ userId: 99, headers: { authorization: '******' } });
    res = createMockResponse();
    jest.clearAllMocks();
  });

  // ============================================
  // GET /api/admin/sessions
  // ============================================

  describe('GET /sessions', () => {
    it('should return list of active sessions', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getMany = jest.fn().mockResolvedValue([mockToken]);
      mockRefreshTokenRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      const mockLogQb = createMockQueryBuilder();
      mockLogQb.getRawMany = jest.fn().mockResolvedValue([{ userId: 1, totalSeconds: '3600' }]);
      mockSessionLogRepository.createQueryBuilder = jest.fn().mockReturnValue(mockLogQb);

      (jwt.decodeToken as jest.Mock).mockReturnValue({ jti: 'other-token' });

      await AdminSessionsController.getAllSessions(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              tokenId: 'token-uuid-1234',
              userId: 1,
              username: 'jankowalski',
              firstName: 'Jan',
              lastName: 'Kowalski',
              role: 'admin',
              email: 'jan@example.com',
              ipAddress: '127.0.0.1',
              totalSessionTimeSeconds: 3600,
              isCurrentSession: false,
            }),
          ]),
        })
      );
    });

    it('should return empty array when no active sessions', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getMany = jest.fn().mockResolvedValue([]);
      mockRefreshTokenRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      const mockLogQb = createMockQueryBuilder();
      mockLogQb.getRawMany = jest.fn().mockResolvedValue([]);
      mockSessionLogRepository.createQueryBuilder = jest.fn().mockReturnValue(mockLogQb);

      (jwt.decodeToken as jest.Mock).mockReturnValue(null);

      await AdminSessionsController.getAllSessions(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });

    it('should mark current session as isCurrentSession=true', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getMany = jest.fn().mockResolvedValue([mockToken]);
      mockRefreshTokenRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      const mockLogQb = createMockQueryBuilder();
      mockLogQb.getRawMany = jest.fn().mockResolvedValue([]);
      mockSessionLogRepository.createQueryBuilder = jest.fn().mockReturnValue(mockLogQb);

      // Same tokenId as the session — provide an Authorization header so the controller can decode the jti claim
      req = createMockRequest({
        userId: 99,
        headers: { authorization: 'Bearer test-access-token' },
      });
      (jwt.decodeToken as jest.Mock).mockReturnValue({ jti: 'token-uuid-1234' });

      await AdminSessionsController.getAllSessions(req as Request, res as Response);

      const call = (res.json as jest.Mock).mock.calls[0][0];
      expect(call.data[0].isCurrentSession).toBe(true);
    });

    it('should return 500 on database error', async () => {
      mockRefreshTokenRepository.createQueryBuilder = jest.fn().mockImplementation(() => {
        throw new Error('DB error');
      });

      await AdminSessionsController.getAllSessions(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  // ============================================
  // GET /api/admin/sessions/stats
  // ============================================

  describe('GET /sessions/stats', () => {
    it('should return session statistics', async () => {
      // activeSessions count
      const mockActiveQb = createMockQueryBuilder();
      mockActiveQb.getCount = jest.fn().mockResolvedValue(4);
      // loggedToday count
      const mockTodayQb = createMockQueryBuilder();
      mockTodayQb.getRawOne = jest.fn().mockResolvedValue({ count: '12' });
      // total users count
      const mockUsersQb = createMockQueryBuilder();
      mockUsersQb.getCount = jest.fn().mockResolvedValue(25);
      // avg session seconds
      const mockAvgQb = createMockQueryBuilder();
      mockAvgQb.getRawOne = jest.fn().mockResolvedValue({ avg: '2820' }); // 47 min

      let rtQbCallCount = 0;
      mockRefreshTokenRepository.createQueryBuilder = jest.fn().mockImplementation(() => {
        rtQbCallCount++;
        return mockActiveQb;
      });

      let slQbCallCount = 0;
      mockSessionLogRepository.createQueryBuilder = jest.fn().mockImplementation(() => {
        slQbCallCount++;
        if (slQbCallCount === 1) return mockTodayQb;
        return mockAvgQb;
      });

      mockUserRepository.createQueryBuilder = jest.fn().mockReturnValue(mockUsersQb);

      await AdminSessionsController.getSessionStats(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            activeSessions: 4,
            loggedTodayCount: 12,
            totalUsersCount: 25,
            avgSessionMinutes: 47,
          }),
        })
      );
    });

    it('should return zeros when no data', async () => {
      const mockActiveQb = createMockQueryBuilder();
      mockActiveQb.getCount = jest.fn().mockResolvedValue(0);
      const mockTodayQb = createMockQueryBuilder();
      mockTodayQb.getRawOne = jest.fn().mockResolvedValue({ count: '0' });
      const mockUsersQb = createMockQueryBuilder();
      mockUsersQb.getCount = jest.fn().mockResolvedValue(0);
      const mockAvgQb = createMockQueryBuilder();
      mockAvgQb.getRawOne = jest.fn().mockResolvedValue({ avg: null });

      mockRefreshTokenRepository.createQueryBuilder = jest.fn().mockReturnValue(mockActiveQb);

      let slCall = 0;
      mockSessionLogRepository.createQueryBuilder = jest.fn().mockImplementation(() => {
        slCall++;
        return slCall === 1 ? mockTodayQb : mockAvgQb;
      });

      mockUserRepository.createQueryBuilder = jest.fn().mockReturnValue(mockUsersQb);

      await AdminSessionsController.getSessionStats(req as Request, res as Response);

      const call = (res.json as jest.Mock).mock.calls[0][0];
      expect(call.success).toBe(true);
      expect(call.data.activeSessions).toBe(0);
      expect(call.data.avgSessionMinutes).toBe(0);
    });

    it('should return 500 on error', async () => {
      mockRefreshTokenRepository.createQueryBuilder = jest.fn().mockImplementation(() => {
        throw new Error('DB error');
      });

      await AdminSessionsController.getSessionStats(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  // ============================================
  // DELETE /api/admin/sessions/:tokenId
  // ============================================

  describe('DELETE /sessions/:tokenId', () => {
    it('should revoke token and return success', async () => {
      req = createMockRequest({
        userId: 99,
        params: { tokenId: 'token-uuid-1234' },
        headers: {},
      });

      mockRefreshTokenRepository.findOne = jest.fn().mockResolvedValue({ ...mockToken });
      mockRefreshTokenRepository.save = jest.fn().mockResolvedValue({});
      mockSessionLogRepository.findOne = jest.fn().mockResolvedValue({ ...mockSessionLog });
      mockSessionLogRepository.save = jest.fn().mockResolvedValue({});

      await AdminSessionsController.forceLogout(req as Request, res as Response);

      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ revoked: true })
      );
      expect(mockSessionLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ logoutType: 'admin_forced' })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { tokenId: 'token-uuid-1234', userId: 1 },
        })
      );
    });

    it('should return 404 for non-existent tokenId', async () => {
      req = createMockRequest({
        userId: 99,
        params: { tokenId: 'non-existent-token' },
        headers: {},
      });

      mockRefreshTokenRepository.findOne = jest.fn().mockResolvedValue(null);

      await AdminSessionsController.forceLogout(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Sesja nie istnieje' })
      );
    });

    it('should return 404 for already revoked token', async () => {
      req = createMockRequest({
        userId: 99,
        params: { tokenId: 'token-uuid-1234' },
        headers: {},
      });

      mockRefreshTokenRepository.findOne = jest.fn().mockResolvedValue({
        ...mockToken,
        revoked: true,
        revokedAt: new Date(),
      });

      await AdminSessionsController.forceLogout(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Sesja już została zakończona' })
      );
    });

    it('should return 500 on database error', async () => {
      req = createMockRequest({
        userId: 99,
        params: { tokenId: 'token-uuid-1234' },
        headers: {},
      });

      mockRefreshTokenRepository.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await AdminSessionsController.forceLogout(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should handle missing session log gracefully', async () => {
      req = createMockRequest({
        userId: 99,
        params: { tokenId: 'token-uuid-1234' },
        headers: {},
      });

      mockRefreshTokenRepository.findOne = jest.fn().mockResolvedValue({ ...mockToken });
      mockRefreshTokenRepository.save = jest.fn().mockResolvedValue({});
      mockSessionLogRepository.findOne = jest.fn().mockResolvedValue(null);

      await AdminSessionsController.forceLogout(req as Request, res as Response);

      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ revoked: true })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});

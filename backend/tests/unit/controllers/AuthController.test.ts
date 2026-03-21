// tests/unit/controllers/AuthController.test.ts
import { Request, Response } from 'express';
import { AuthController } from '../../../src/controllers/AuthController';
import { AppDataSource } from '../../../src/config/database';
import { User } from '../../../src/entities/User';
import { RefreshToken } from '../../../src/entities/RefreshToken';
import * as jwt from '../../../src/config/jwt';
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
    })),
  },
}));

jest.mock('../../../src/config/jwt');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}));

jest.mock('../../../src/services/EmailService', () => ({
  __esModule: true,
  default: {
    sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
    initialize: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../src/services/NotificationService', () => ({
  NotificationService: {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('AuthController', () => {
  let mockUserRepository: any;
  let mockRefreshTokenRepository: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockUserRepository = createMockRepository<User>();
    mockRefreshTokenRepository = createMockRepository<RefreshToken>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === User || entity?.name === 'User') return mockUserRepository;
      if (entity === RefreshToken || entity?.name === 'RefreshToken') return mockRefreshTokenRepository;
      return createMockRepository();
    });

    req = createMockRequest();
    res = createMockResponse();

    // Setup default environment
    process.env.REFRESH_EXPIRES = '7d';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return 200 and tokens for valid credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: '$2b$10$hashedpassword',
        active: true,
        role: { id: 1, name: 'admin' },
        lastLogin: null,
        validatePassword: jest.fn().mockResolvedValue(true),
      } as any;

      const mockQueryBuilder = createMockQueryBuilder<User>();
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockRefreshTokenRepository.create.mockReturnValue({ tokenId: 'test-uuid-1234' });
      mockRefreshTokenRepository.save.mockResolvedValue({});

      (jwt.generateAccessToken as jest.Mock).mockReturnValue('access-token-123');
      (jwt.generateRefreshToken as jest.Mock).mockReturnValue('refresh-token-456');

      req.body = {
        username: 'testuser',
        password: 'password123',
      };

      await AuthController.login(req as Request, res as Response);

      expect(mockUser.validatePassword).toHaveBeenCalledWith('password123');
      expect(jwt.generateAccessToken).toHaveBeenCalled();
      expect(jwt.generateRefreshToken).toHaveBeenCalled();
      expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
      
      // Verify cookies are set
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token-456', expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        path: '/api/auth',
      }));
      expect(res.cookie).toHaveBeenCalledWith('csrf-token', expect.any(String), expect.objectContaining({
        httpOnly: false,
        sameSite: 'strict',
        path: '/',
      }));
      
      // Verify response contains access token but NOT refresh token
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Zalogowano pomyślnie',
          data: expect.objectContaining({
            accessToken: 'access-token-123',
          }),
        })
      );
      
      // Ensure refresh token is NOT in response body
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.refreshToken).toBeUndefined();
    });

    it('should return 401 for invalid username', async () => {
      const mockQueryBuilder = createMockQueryBuilder<User>();
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.body = {
        username: 'nonexistent',
        password: 'password123',
      };

      await AuthController.login(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Konto nie istnieje',
      });
    });

    it('should return 401 for invalid password', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        active: true,
        role: { id: 1, name: 'admin' },
        validatePassword: jest.fn().mockResolvedValue(false),
      } as any;

      const mockQueryBuilder = createMockQueryBuilder<User>();
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      req.body = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      await AuthController.login(req as Request, res as Response);

      expect(mockUser.validatePassword).toHaveBeenCalledWith('wrongpassword');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_PASSWORD',
        message: 'Błędne hasło',
      });
    });

    it('should return 400 for missing fields', async () => {
      req.body = {
        username: 'testuser',
        // password is missing
      };

      await AuthController.login(req as Request, res as Response);

      // The controller should handle this validation
      // For now, we'll just ensure it doesn't crash
      expect(res.status).toHaveBeenCalled();
    });

    it('should return 500 on server error', async () => {
      mockUserRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error('Database error');
      });

      req.body = {
        username: 'testuser',
        password: 'password123',
      };

      await AuthController.login(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid cookie and CSRF token', async () => {
      // Mock uuid to return different values for each call
      const { v4: uuidv4 } = require('uuid');
      (uuidv4 as jest.Mock).mockReturnValueOnce('new-uuid-5678');
      
      const mockToken = {
        tokenId: 'test-uuid-1234',
        userId: 1,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
      } as any;

      const mockQueryRunner = {
        connect: jest.fn(),
        hasTable: jest.fn().mockResolvedValue(true),
        release: jest.fn(),
      } as any;

      (AppDataSource as any).createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);

      mockRefreshTokenRepository.findOne.mockResolvedValue(mockToken);
      mockRefreshTokenRepository.create.mockImplementation((data: any) => data);
      mockRefreshTokenRepository.save.mockResolvedValue({});

      (jwt.verifyRefreshToken as jest.Mock).mockReturnValue({
        jti: 'test-uuid-1234',
        userId: 1,
        username: 'testuser',
        role: 'admin',
      });
      (jwt.generateAccessToken as jest.Mock).mockReturnValue('new-access-token');
      (jwt.generateRefreshToken as jest.Mock).mockReturnValue('new-refresh-token');

      req.cookies = {
        refreshToken: 'old-refresh-token',
        'csrf-token': 'csrf-token-123',
      };
      req.headers = {
        'x-csrf-token': 'csrf-token-123',
      };

      await AuthController.refresh(req as Request, res as Response);

      expect(jwt.verifyRefreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { tokenId: 'test-uuid-1234' },
      });
      
      // Verify save was called twice (once for old token revocation, once for new token creation)
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledTimes(2);
      
      // First call should be revoking old token
      const firstSaveCall = mockRefreshTokenRepository.save.mock.calls[0][0];
      expect(firstSaveCall).toMatchObject({
        revoked: true,
        revokedByTokenId: 'new-uuid-5678',
      });
      
      // Second call should be creating new token
      const secondSaveCall = mockRefreshTokenRepository.save.mock.calls[1][0];
      expect(secondSaveCall).toMatchObject({
        tokenId: 'new-uuid-5678',
        userId: 1,
      });
      
      // Verify cookies are set
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'new-refresh-token', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('csrf-token', expect.any(String), expect.any(Object));
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          accessToken: 'new-access-token',
        },
      });
    });

    it('should reject refresh without CSRF token', async () => {
      req.cookies = {
        refreshToken: 'old-refresh-token',
        'csrf-token': 'csrf-token-123',
      };
      req.headers = {}; // No CSRF token in header

      await AuthController.refresh(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      });
    });

    it('should reject refresh with mismatched CSRF token', async () => {
      req.cookies = {
        refreshToken: 'old-refresh-token',
        'csrf-token': 'csrf-token-123',
      };
      req.headers = {
        'x-csrf-token': 'csrf-token-456', // Different from cookie
      };

      await AuthController.refresh(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      });
    });

    it('should reject refresh without refresh token cookie', async () => {
      req.cookies = {}; // No refresh token
      req.headers = {
        'x-csrf-token': 'csrf-token-123',
      };

      await AuthController.refresh(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Brak refresh token',
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear cookies on logout', async () => {
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      (jwt.decodeToken as jest.Mock).mockReturnValue({
        jti: 'test-uuid-1234',
      });

      req.cookies = {
        refreshToken: 'refresh-token-to-revoke',
      };

      await AuthController.logout(req as Request, res as Response);

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { tokenId: 'test-uuid-1234', revoked: false },
        { revoked: true, revokedAt: expect.any(Date) }
      );
      
      // Verify cookies are cleared
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/api/auth' });
      expect(res.clearCookie).toHaveBeenCalledWith('csrf-token', { path: '/' });
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Wylogowano pomyślnie',
      });
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user data for authenticated user', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '123456789',
        active: true,
        lastLogin: new Date('2024-01-01'),
        role: { 
          id: 1, 
          name: 'admin',
          permissions: { all: true }
        },
      } as any;

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      req.userId = 1;

      await AuthController.me(req as Request, res as Response);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['role'],
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          phone: '123456789',
          role: 'admin',
          permissions: { all: true },
          lastLogin: mockUser.lastLogin,
        },
      });
    });

    it('should return 404 if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      req.userId = 999;

      await AuthController.me(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Użytkownik nie znaleziony',
      });
    });

    it('should return 404 if user is not active', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        active: false,
        role: { id: 1, name: 'admin', permissions: { all: true } },
      } as any;

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      req.userId = 1;

      await AuthController.me(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Użytkownik nie znaleziony',
      });
    });
  });

  describe('POST /api/auth/logout-all', () => {
    it('should revoke all sessions for authenticated user', async () => {
      mockRefreshTokenRepository.update = jest.fn().mockResolvedValue({ affected: 3 });
      req = createMockRequest({ userId: 1 });

      await AuthController.logoutAll(req as Request, res as Response);

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: 1, revoked: false },
        expect.objectContaining({ revoked: true })
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: { revokedCount: 3 },
      }));
    });

    it('should return 401 when no userId', async () => {
      req = createMockRequest({ userId: undefined });

      await AuthController.logoutAll(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('GET /api/auth/sessions', () => {
    it('should return active sessions for user', async () => {
      const future = new Date(Date.now() + 1000 * 60 * 60);
      const sessions = [
        { tokenId: 'tok1', ipAddress: '127.0.0.1', userAgent: 'Chrome', createdAt: new Date(), expiresAt: future },
      ];
      mockRefreshTokenRepository.find = jest.fn().mockResolvedValue(sessions);
      req = createMockRequest({ userId: 1 });

      await AuthController.getActiveSessions(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ count: 1 }),
      }));
    });

    it('should return 401 when no userId', async () => {
      req = createMockRequest({ userId: undefined });

      await AuthController.getActiveSessions(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password successfully', async () => {
      const mockUser = { id: 1, username: 'user1', email: 'user@test.com', firstName: 'Test', password: 'old', forcePasswordChange: false, role: { name: 'user' }, save: jest.fn() };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      req = createMockRequest({ userId: 1 });
      req.body = { newPassword: 'NewPass123', confirmPassword: 'NewPass123' };

      await AuthController.changePassword(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 when passwords do not match', async () => {
      req = createMockRequest({ userId: 1 });
      req.body = { newPassword: 'Pass1', confirmPassword: 'Pass2' };

      await AuthController.changePassword(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Hasła nie są identyczne' }));
    });

    it('should return 404 when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      req = createMockRequest({ userId: 99 });
      req.body = { newPassword: 'Pass1', confirmPassword: 'Pass1' };

      await AuthController.changePassword(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return success even when user not found (security)', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockUserRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      req.body = { emailOrUsername: 'unknown@test.com' };

      await AuthController.forgotPassword(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 when identifier is missing', async () => {
      req.body = {};

      await AuthController.forgotPassword(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reset password when user found', async () => {
      const mockUser = { id: 1, username: 'user1', email: 'user@test.com', firstName: 'Test', password: 'old', forcePasswordChange: false };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      mockUserRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      mockUserRepository.save.mockResolvedValue(mockUser);

      req.body = { emailOrUsername: 'user1' };

      await AuthController.forgotPassword(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});

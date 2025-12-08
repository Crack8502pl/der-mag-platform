// tests/unit/middleware/auth.test.ts
import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../../src/middleware/auth';
import * as jwt from '../../../src/config/jwt';
import { AppDataSource } from '../../../src/config/database';
import { User } from '../../../src/entities/User';
import { RefreshToken } from '../../../src/entities/RefreshToken';
import { createMockRequest, createMockResponse, createMockNext } from '../../mocks/request.mock';
import { createMockRepository } from '../../mocks/database.mock';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../src/config/jwt');

describe('Auth Middleware', () => {
  let mockUserRepository: any;
  let mockRefreshTokenRepository: any;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    mockUserRepository = createMockRepository<User>();
    mockRefreshTokenRepository = createMockRepository<RefreshToken>();
    
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === User) return mockUserRepository;
      if (entity === RefreshToken) return mockRefreshTokenRepository;
      return createMockRepository();
    });

    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();

    // Reset environment variables
    delete process.env.PARANOID_MODE;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    const mockPayload = {
      userId: 1,
      username: 'testuser',
      role: 'admin',
      jti: 'test-token-id',
    };

    it('should authenticate valid token and set user data', async () => {
      req.headers = {
        authorization: 'Bearer valid-token',
      };

      (jwt.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      mockUserRepository.findOne.mockResolvedValue({ id: 1, username: 'testuser', active: true });

      await authenticate(req as Request, res as Response, next);

      expect(jwt.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(req.user).toEqual(mockPayload);
      expect(req.userId).toBe(1);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, active: true },
      });
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if no authorization header', async () => {
      req.headers = {};

      await authenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Brak tokenu autoryzacyjnego',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', async () => {
      req.headers = {
        authorization: 'InvalidFormat token',
      };

      await authenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Brak tokenu autoryzacyjnego',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid or expired token', async () => {
      req.headers = {
        authorization: 'Bearer invalid-token',
      };

      (jwt.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Nieprawidłowy lub wygasły token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if user is inactive', async () => {
      req.headers = {
        authorization: 'Bearer valid-token',
      };

      (jwt.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      mockUserRepository.findOne.mockResolvedValue(null);

      await authenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Użytkownik nieaktywny lub nie istnieje',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it.skip('should check token in database when PARANOID_MODE is enabled', async () => {
      process.env.PARANOID_MODE = 'true';

      req.headers = {
        authorization: 'Bearer valid-token',
      };

      (jwt.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      mockUserRepository.findOne.mockResolvedValue({ id: 1, username: 'testuser', active: true });
      mockRefreshTokenRepository.findOne.mockResolvedValue({ tokenId: 'test-token-id', revoked: false });

      // Ensure the right repository is returned
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
        if (entity.name === 'User' || entity === User) return mockUserRepository;
        if (entity.name === 'RefreshToken' || entity === RefreshToken) return mockRefreshTokenRepository;
        return createMockRepository();
      });

      await authenticate(req as Request, res as Response, next);

      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { tokenId: 'test-token-id', revoked: false },
      });
      expect(next).toHaveBeenCalled();
    });

    it.skip('should return 401 if token is revoked in PARANOID_MODE', async () => {
      process.env.PARANOID_MODE = 'true';

      req.headers = {
        authorization: 'Bearer valid-token',
      };

      (jwt.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);
      mockUserRepository.findOne.mockResolvedValue({ id: 1, username: 'testuser', active: true });
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      // Ensure the right repository is returned
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
        if (entity.name === 'User' || entity === User) return mockUserRepository;
        if (entity.name === 'RefreshToken' || entity === RefreshToken) return mockRefreshTokenRepository;
        return createMockRepository();
      });

      await authenticate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token został unieważniony',
        code: 'TOKEN_REVOKED',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    beforeEach(() => {
      req.user = {
        userId: 1,
        username: 'testuser',
        role: 'manager',
      };
    });

    it('should allow access for authorized role', async () => {
      const middleware = authorize('admin', 'manager');

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', async () => {
      const middleware = authorize('admin');

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Brak uprawnień do wykonania tej operacji',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;
      const middleware = authorize('admin');

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Brak autoryzacji',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

// tests/unit/controllers/UserPreferencesController.test.ts
import { Request, Response } from 'express';
import { UserPreferencesController } from '../../../src/controllers/UserPreferencesController';
import { AppDataSource } from '../../../src/config/database';
import { User } from '../../../src/entities/User';
import { UserPreferences } from '../../../src/entities/UserPreferences';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';
import { createMockRepository } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

// bcrypt needs to work for password tests
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
import bcrypt from 'bcrypt';

describe('UserPreferencesController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mockUserRepo: any;
  let mockPrefsRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockRequest({ userId: 42 });
    res = createMockResponse();

    mockUserRepo = createMockRepository<User>();
    mockPrefsRepo = createMockRepository<UserPreferences>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === User || entity?.name === 'User') return mockUserRepo;
      if (entity === UserPreferences || entity?.name === 'UserPreferences') return mockPrefsRepo;
      return createMockRepository();
    });
  });

  // ─── getPreferences ──────────────────────────────────────────────────────────

  describe('getPreferences', () => {
    it('should return 401 if not authenticated', async () => {
      req = createMockRequest();
      await UserPreferencesController.getPreferences(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return existing preferences', async () => {
      const prefs = { userId: 42, theme: 'husky', emailNotifications: true };
      mockPrefsRepo.findOne.mockResolvedValue(prefs);

      await UserPreferencesController.getPreferences(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: prefs });
    });

    it('should return default preferences when none exist', async () => {
      const defaultPrefs = { userId: 42, theme: 'grover' };
      mockPrefsRepo.findOne.mockResolvedValue(null);
      mockPrefsRepo.create.mockReturnValue(defaultPrefs);

      await UserPreferencesController.getPreferences(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: defaultPrefs });
    });
  });

  // ─── updatePreferences ───────────────────────────────────────────────────────

  describe('updatePreferences', () => {
    it('should return 401 if not authenticated', async () => {
      req = createMockRequest();
      req.body = { theme: 'husky' };
      await UserPreferencesController.updatePreferences(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 for an invalid theme value', async () => {
      req.body = { theme: 'invalid-theme' };
      await UserPreferencesController.updatePreferences(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should accept valid theme values: grover, husky, auto', async () => {
      const prefs = { userId: 42, theme: 'grover' };
      mockPrefsRepo.findOne.mockResolvedValue(prefs);
      mockPrefsRepo.save.mockResolvedValue({ ...prefs, theme: 'husky' });

      req.body = { theme: 'husky' };
      await UserPreferencesController.updatePreferences(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 400 when sessionTimeout is out of range (below 15)', async () => {
      req.body = { sessionTimeout: 5 };
      await UserPreferencesController.updatePreferences(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when sessionTimeout exceeds 1440', async () => {
      req.body = { sessionTimeout: 9999 };
      await UserPreferencesController.updatePreferences(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should accept sessionTimeout within valid range', async () => {
      const prefs = { userId: 42, sessionTimeout: 480 };
      mockPrefsRepo.findOne.mockResolvedValue(prefs);
      mockPrefsRepo.save.mockResolvedValue({ ...prefs, sessionTimeout: 60 });

      req.body = { sessionTimeout: 60 };
      await UserPreferencesController.updatePreferences(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should create preferences if they do not exist', async () => {
      mockPrefsRepo.findOne.mockResolvedValue(null);
      const newPrefs = { userId: 42, emailNotifications: false };
      mockPrefsRepo.create.mockReturnValue(newPrefs);
      mockPrefsRepo.save.mockResolvedValue(newPrefs);

      req.body = { emailNotifications: false };
      await UserPreferencesController.updatePreferences(req as Request, res as Response);

      expect(mockPrefsRepo.create).toHaveBeenCalledWith({ userId: 42 });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── updateProfile ───────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('should return 401 if not authenticated', async () => {
      req = createMockRequest();
      req.body = { firstName: 'Jan' };
      await UserPreferencesController.updateProfile(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when no update fields are provided', async () => {
      req.body = {};
      await UserPreferencesController.updateProfile(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when user is not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      req.body = { firstName: 'Jan' };
      await UserPreferencesController.updateProfile(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 409 when email is already taken by another user', async () => {
      const user = { id: 42, firstName: 'Jan', lastName: 'Kowalski', email: 'old@example.com' };
      const conflictUser = { id: 99, email: 'taken@example.com' };
      mockUserRepo.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(conflictUser);

      req.body = { email: 'taken@example.com' };
      await UserPreferencesController.updateProfile(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should update profile fields and return 200', async () => {
      const user = { id: 42, firstName: 'Jan', lastName: 'Kowalski', email: 'jan@example.com', phone: null };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue({ ...user, firstName: 'Marek' });

      req.body = { firstName: 'Marek' };
      await UserPreferencesController.updateProfile(req as Request, res as Response);

      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  // ─── changePassword ──────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('should return 401 if not authenticated', async () => {
      req = createMockRequest();
      req.body = { currentPassword: 'old', newPassword: 'newpass123' };
      await UserPreferencesController.changePassword(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when fields are missing', async () => {
      req.body = { currentPassword: 'old' }; // missing newPassword
      await UserPreferencesController.changePassword(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when new password is shorter than 8 characters', async () => {
      req.body = { currentPassword: 'oldpass', newPassword: 'short' };
      await UserPreferencesController.changePassword(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when user is not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      req.body = { currentPassword: 'oldpass', newPassword: 'newpassword' };
      await UserPreferencesController.changePassword(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 401 when current password is incorrect', async () => {
      const user = { id: 42, password: 'hashed' };
      mockUserRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      req.body = { currentPassword: 'wrongpass', newPassword: 'newpassword' };
      await UserPreferencesController.changePassword(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should change password successfully when current password matches', async () => {
      const user = { id: 42, password: 'hashed', forcePasswordChange: false, passwordChangedAt: null };
      mockUserRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhashed');
      mockUserRepo.save.mockResolvedValue({ ...user, password: 'newhashed' });

      req.body = { currentPassword: 'correctpass', newPassword: 'newpassword' };
      await UserPreferencesController.changePassword(req as Request, res as Response);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 12);
      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, message: expect.any(String) });
    });
  });
});

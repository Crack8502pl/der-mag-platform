import { Request, Response } from 'express';
import { AppDataSource } from '../../../src/config/database';
import { EmailAutomationAdminController } from '../../../src/controllers/EmailAutomationAdminController';
import { User } from '../../../src/entities/User';
import EmailAutomationAdminService from '../../../src/services/EmailAutomationAdminService';
import { createMockRepository } from '../../mocks/database.mock';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../src/services/EmailAutomationAdminService', () => ({
  __esModule: true,
  default: {
    getGlobalSetting: jest.fn(),
    setGlobalSetting: jest.fn(),
    setUserPause: jest.fn(),
  },
  EMAIL_AUTOMATION_REASON_MAX_LENGTH: 500,
}));

describe('EmailAutomationAdminController', () => {
  let userRepository: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository = createMockRepository<User>();
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === User) return userRepository;
      return createMockRepository();
    });
    req = createMockRequest();
    res = createMockResponse();
  });

  it('returns 200 for admin when patching global automation setting', async () => {
    req = createMockRequest({ userId: 2, body: { enabled: false } });
    userRepository.findOne.mockResolvedValue({ id: 2, role: { name: 'admin' } });
    (EmailAutomationAdminService.setGlobalSetting as jest.Mock).mockResolvedValue({ enabled: false });

    await EmailAutomationAdminController.updateGlobalSetting(req as Request, res as Response);

    expect(EmailAutomationAdminService.setGlobalSetting).toHaveBeenCalledWith(false, 2);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { enabled: false },
    });
  });

  it('returns 401 when patching global automation without authentication', async () => {
    req = createMockRequest({ body: { enabled: true } });

    await EmailAutomationAdminController.updateGlobalSetting(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when patching global automation as non-admin', async () => {
    req = createMockRequest({ userId: 3, body: { enabled: true } });
    userRepository.findOne.mockResolvedValue({ id: 3, role: { name: 'manager' } });

    await EmailAutomationAdminController.updateGlobalSetting(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 200 for admin when patching per-user automation pause', async () => {
    req = createMockRequest({
      userId: 2,
      params: { id: '15' },
      body: { paused: true, reason: 'Urlop' },
    });
    userRepository.findOne.mockResolvedValue({ id: 2, role: { name: 'admin' } });
    (EmailAutomationAdminService.setUserPause as jest.Mock).mockResolvedValue({
      id: 15,
      emailAutomationPaused: true,
      emailAutomationPauseReason: 'Urlop',
      emailAutomationPausedAt: new Date('2026-08-07T00:00:00.000Z'),
      emailAutomationPausedBy: 2,
    });

    await EmailAutomationAdminController.updateUserPause(req as Request, res as Response);

    expect(EmailAutomationAdminService.setUserPause).toHaveBeenCalledWith(15, true, 2, 'Urlop');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        id: 15,
        emailAutomationPaused: true,
        emailAutomationPauseReason: 'Urlop',
        emailAutomationPausedBy: 2,
      }),
    });
  });

  it('returns 404 when the target user does not exist', async () => {
    req = createMockRequest({
      userId: 2,
      params: { id: '999' },
      body: { paused: true },
    });
    userRepository.findOne.mockResolvedValue({ id: 2, role: { name: 'admin' } });
    (EmailAutomationAdminService.setUserPause as jest.Mock).mockRejectedValue(new Error('USER_NOT_FOUND'));

    await EmailAutomationAdminController.updateUserPause(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when a non-admin patches per-user automation', async () => {
    req = createMockRequest({
      userId: 7,
      params: { id: '15' },
      body: { paused: false },
    });
    userRepository.findOne.mockResolvedValue({ id: 7, role: { name: 'worker' } });

    await EmailAutomationAdminController.updateUserPause(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 200 for GET global setting as admin', async () => {
    req = createMockRequest({ userId: 2 });
    userRepository.findOne.mockResolvedValue({ id: 2, role: { name: 'admin' } });
    (EmailAutomationAdminService.getGlobalSetting as jest.Mock).mockResolvedValue({ enabled: true });

    await EmailAutomationAdminController.getGlobalSetting(req as Request, res as Response);

    expect(EmailAutomationAdminService.getGlobalSetting).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { enabled: true } });
  });

  it('PATCH sets enabled to false (OFF)', async () => {
    req = createMockRequest({ userId: 2, body: { enabled: false } });
    userRepository.findOne.mockResolvedValue({ id: 2, role: { name: 'admin' } });
    (EmailAutomationAdminService.setGlobalSetting as jest.Mock).mockResolvedValue({ enabled: false });

    await EmailAutomationAdminController.updateGlobalSetting(req as Request, res as Response);

    expect(EmailAutomationAdminService.setGlobalSetting).toHaveBeenCalledWith(false, 2);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { enabled: false } });
  });

  it('GET returns false after switch was set to OFF', async () => {
    req = createMockRequest({ userId: 2 });
    userRepository.findOne.mockResolvedValue({ id: 2, role: { name: 'admin' } });
    (EmailAutomationAdminService.getGlobalSetting as jest.Mock).mockResolvedValue({ enabled: false });

    await EmailAutomationAdminController.getGlobalSetting(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: { enabled: false } });
  });

  it('returns 400 when enabled is a string instead of boolean', async () => {
    req = createMockRequest({ userId: 2, body: { enabled: 'false' } });
    userRepository.findOne.mockResolvedValue({ id: 2, role: { name: 'admin' } });

    await EmailAutomationAdminController.updateGlobalSetting(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(EmailAutomationAdminService.setGlobalSetting).not.toHaveBeenCalled();
  });

  it('does not throw unhandled rejection when called as a detached function reference', async () => {
    // Simulate Express calling the static method as a plain function (this=undefined)
    const detached = EmailAutomationAdminController.updateGlobalSetting;
    req = createMockRequest({ userId: 2, body: { enabled: false } });
    userRepository.findOne.mockResolvedValue({ id: 2, role: { name: 'admin' } });
    (EmailAutomationAdminService.setGlobalSetting as jest.Mock).mockResolvedValue({ enabled: false });

    await expect(detached(req as Request, res as Response)).resolves.toBeUndefined();
    expect(EmailAutomationAdminService.setGlobalSetting).toHaveBeenCalledWith(false, 2);
  });
});

import { AppDataSource } from '../../../src/config/database';
import { EmailAutomationAuditLog } from '../../../src/entities/EmailAutomationAuditLog';
import { SystemConfig } from '../../../src/entities/SystemConfig';
import { User } from '../../../src/entities/User';
import EmailAutomationGuardService from '../../../src/services/EmailAutomationGuardService';
import { createMockRepository } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../src/services/EmailAutomationGuardService', () => ({
  __esModule: true,
  default: {
    invalidateGlobalCache: jest.fn(),
    invalidateUserCache: jest.fn(),
    isGlobalEnabled: jest.fn(),
  },
}));

describe('EmailAutomationAdminService', () => {
  let systemConfigRepository: any;
  let userRepository: any;
  let auditRepository: any;

  beforeEach(() => {
    jest.clearAllMocks();

    systemConfigRepository = createMockRepository<SystemConfig>();
    userRepository = createMockRepository<User>();
    auditRepository = createMockRepository<EmailAutomationAuditLog>();
    auditRepository.create.mockImplementation((value: any) => value);

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === SystemConfig) return systemConfigRepository;
      if (entity === User) return userRepository;
      if (entity === EmailAutomationAuditLog) return auditRepository;
      return createMockRepository();
    });
  });

  it('updates the global flag and writes an audit entry', async () => {
    systemConfigRepository.findOne.mockResolvedValue({
      key: 'email_automation_enabled',
      value: 'true',
      category: 'email_automation',
      updatedById: null,
    });
    systemConfigRepository.save.mockResolvedValue(undefined);
    auditRepository.save.mockResolvedValue(undefined);

    const module = await import('../../../src/services/EmailAutomationAdminService');
    const service = new module.EmailAutomationAdminService();

    await expect(service.setGlobalSetting(false, 7)).resolves.toEqual({ enabled: false });

    expect(systemConfigRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 'false',
        updatedById: 7,
      }),
    );
    expect(auditRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        actorAdminId: 7,
        targetType: 'system',
        field: 'email_automation_enabled',
        oldValue: 'true',
        newValue: 'false',
      }),
    );
    expect(EmailAutomationGuardService.invalidateGlobalCache).toHaveBeenCalled();
  });

  it('updates per-user pause fields and writes audit with old/new values', async () => {
    const saveMock = jest.fn().mockImplementation(async (value: any) => value);
    userRepository.findOne.mockResolvedValue({
      id: 15,
      emailAutomationPaused: false,
      emailAutomationPauseReason: null,
      emailAutomationPausedAt: null,
      emailAutomationPausedBy: null,
    });
    userRepository.save.mockImplementation(saveMock);
    auditRepository.save.mockResolvedValue(undefined);

    const module = await import('../../../src/services/EmailAutomationAdminService');
    const service = new module.EmailAutomationAdminService();

    const result = await service.setUserPause(15, true, 3, 'Urlop');

    expect(result).toEqual(
      expect.objectContaining({
        emailAutomationPaused: true,
        emailAutomationPauseReason: 'Urlop',
        emailAutomationPausedBy: 3,
      }),
    );
    expect(auditRepository.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        actorAdminId: 3,
        targetType: 'user',
        targetId: 15,
        field: 'email_automation_paused',
        oldValue: 'false',
        newValue: 'true',
      }),
    );
    expect(auditRepository.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        actorAdminId: 3,
        targetType: 'user',
        targetId: 15,
        field: 'email_automation_pause_reason',
        oldValue: null,
        newValue: 'Urlop',
      }),
    );
    expect(EmailAutomationGuardService.invalidateUserCache).toHaveBeenCalledWith(15);
  });
});

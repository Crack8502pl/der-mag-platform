import { AppDataSource } from '../../../src/config/database';
import { User } from '../../../src/entities/User';
import { SystemConfig } from '../../../src/entities/SystemConfig';
import { createMockRepository } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('EmailAutomationGuardService', () => {
  let systemConfigRepository: any;
  let userRepository: any;

  beforeEach(() => {
    jest.clearAllMocks();

    systemConfigRepository = createMockRepository<SystemConfig>();
    userRepository = createMockRepository<User>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === SystemConfig) return systemConfigRepository;
      if (entity === User) return userRepository;
      return createMockRepository();
    });
  });

  it('returns false when global automation is disabled', async () => {
    systemConfigRepository.findOne.mockResolvedValue({ key: 'email_automation_enabled', value: 'false' });

    const module = await import('../../../src/services/EmailAutomationGuardService');
    const service = new module.EmailAutomationGuardService();

    await expect(service.canSendAutomatedEmail('12')).resolves.toBe(false);
  });

  it('returns true when global automation is enabled and user is active', async () => {
    systemConfigRepository.findOne.mockResolvedValue({ key: 'email_automation_enabled', value: 'true' });
    userRepository.findOne.mockResolvedValue({ id: 12, emailAutomationPaused: false });

    const module = await import('../../../src/services/EmailAutomationGuardService');
    const service = new module.EmailAutomationGuardService();

    await expect(service.canSendAutomatedEmail('12')).resolves.toBe(true);
  });

  it('returns false when user is paused', async () => {
    systemConfigRepository.findOne.mockResolvedValue({ key: 'email_automation_enabled', value: 'true' });
    userRepository.findOne.mockResolvedValue({ id: 12, emailAutomationPaused: true });

    const module = await import('../../../src/services/EmailAutomationGuardService');
    const service = new module.EmailAutomationGuardService();

    await expect(service.canSendAutomatedEmail('12')).resolves.toBe(false);
  });

  it('returns false for a non-existent user and exposes a controlled error from isUserPaused', async () => {
    systemConfigRepository.findOne.mockResolvedValue({ key: 'email_automation_enabled', value: 'true' });
    userRepository.findOne.mockResolvedValue(null);

    const module = await import('../../../src/services/EmailAutomationGuardService');
    const service = new module.EmailAutomationGuardService();

    await expect(service.isUserPaused('999')).rejects.toMatchObject({ name: 'EmailAutomationUserNotFoundError' });
    await expect(service.canSendAutomatedEmail('999')).resolves.toBe(false);
  });
});

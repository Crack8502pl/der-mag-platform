// tests/unit/services/NotificationService.test.ts
import { NotificationService } from '../../../src/services/NotificationService';
import { AppDataSource } from '../../../src/config/database';
import { createMockRepository, createMockQueryBuilder } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../src/services/EmailService', () => ({
  __esModule: true,
  default: {
    sendEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const EmailServiceMock = require('../../../src/services/EmailService').default;

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockUserRepository: any;
  let mockOrderRepository: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = createMockRepository();
    mockOrderRepository = createMockRepository();
    mockQueryBuilder = createMockQueryBuilder();

    mockUserRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockOrderRepository);

    notificationService = new NotificationService();
  });

  describe('notifyNewCompletionTask', () => {
    it('should send notification when order and recipients exist', async () => {
      const mockOrder = {
        id: 1,
        subsystem: {
          subsystemNumber: 'P000010125',
          contract: { contractNumber: 'R0000001_A' },
        },
        assignedTo: { username: 'worker1' },
        items: [{ id: 1 }, { id: 2 }],
        createdAt: new Date(),
        generatedBom: null,
      };

      mockOrderRepository.findOne = jest.fn().mockResolvedValue(mockOrder);

      // Mock getUsersByRoles to return one user with email
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === 'User' || (entity && entity.toString().includes('User'))) {
          const userRepo = createMockRepository();
          const qb = createMockQueryBuilder();
          qb.getMany = jest.fn().mockResolvedValue([
            { id: 1, email: 'admin@test.com', isActive: true, role: { name: 'admin' } },
          ]);
          userRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
          return userRepo;
        }
        return mockOrderRepository;
      });

      await notificationService.notifyNewCompletionTask(1);

      expect(EmailServiceMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('P000010125'),
          template: 'completion-new-task',
        })
      );
    });

    it('should log warning and skip when order not found', async () => {
      mockOrderRepository.findOne = jest.fn().mockResolvedValue(null);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await notificationService.notifyNewCompletionTask(999);

      expect(EmailServiceMock.sendEmail).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should skip email when no recipients found', async () => {
      const mockOrder = {
        id: 1,
        subsystem: {
          subsystemNumber: 'P000010125',
          contract: { contractNumber: 'R0000001_A' },
        },
        assignedTo: { username: 'worker1' },
        items: [],
        createdAt: new Date(),
        generatedBom: null,
      };

      mockOrderRepository.findOne = jest.fn().mockResolvedValue(mockOrder);

      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === 'User' || (entity && entity.toString().includes('User'))) {
          const userRepo = createMockRepository();
          const qb = createMockQueryBuilder();
          qb.getMany = jest.fn().mockResolvedValue([]); // no users
          userRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
          return userRepo;
        }
        return mockOrderRepository;
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await notificationService.notifyNewCompletionTask(1);

      expect(EmailServiceMock.sendEmail).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('notifyMaterialShortage', () => {
    it('should send notification with missing items', async () => {
      const mockOrder = {
        id: 1,
        subsystem: {
          subsystemNumber: 'P000010125',
          contract: { contractNumber: 'R0000001_A' },
        },
      };

      mockOrderRepository.findOne = jest.fn().mockResolvedValue(mockOrder);

      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === 'User' || (entity && entity.toString().includes('User'))) {
          const userRepo = createMockRepository();
          const qb = createMockQueryBuilder();
          qb.getMany = jest.fn().mockResolvedValue([
            { id: 1, email: 'manager@test.com', isActive: true, role: { name: 'manager' } },
          ]);
          userRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
          return userRepo;
        }
        return mockOrderRepository;
      });

      const missingItems = [{ name: 'Cable', quantity: 5 }];

      await notificationService.notifyMaterialShortage(1, missingItems);

      expect(EmailServiceMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('P000010125'),
          template: 'completion-material-shortage',
          priority: 'high',
        })
      );
    });

    it('should handle order not found gracefully', async () => {
      mockOrderRepository.findOne = jest.fn().mockResolvedValue(null);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await notificationService.notifyMaterialShortage(999, []);

      expect(EmailServiceMock.sendEmail).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('notifyCompletionFinished', () => {
    it('should send notification with completed items', async () => {
      const mockOrder = {
        id: 1,
        subsystem: {
          subsystemNumber: 'P000010125',
          contract: { contractNumber: 'R0000001_A' },
        },
        items: [
          { status: 'SCANNED', scannedQuantity: 2, bomItem: { itemName: 'Cable' } },
          { status: 'PENDING', scannedQuantity: 0, bomItem: { itemName: 'Wire' } },
        ],
        completedAt: new Date(),
      };

      mockOrderRepository.findOne = jest.fn().mockResolvedValue(mockOrder);

      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === 'User' || (entity && entity.toString().includes('User'))) {
          const userRepo = createMockRepository();
          const qb = createMockQueryBuilder();
          qb.getMany = jest.fn().mockResolvedValue([
            { id: 1, email: 'prefab@test.com', isActive: true, role: { name: 'prefabricator' } },
          ]);
          userRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
          return userRepo;
        }
        return mockOrderRepository;
      });

      await notificationService.notifyCompletionFinished(1);

      expect(EmailServiceMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('P000010125'),
          template: 'completion-finished',
        })
      );
    });

    it('should handle order not found gracefully', async () => {
      mockOrderRepository.findOne = jest.fn().mockResolvedValue(null);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await notificationService.notifyCompletionFinished(999);

      expect(EmailServiceMock.sendEmail).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('notifyInstallationTask', () => {
    it('should send notification to workers', async () => {
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === 'User' || (entity && entity.toString().includes('User'))) {
          const userRepo = createMockRepository();
          const qb = createMockQueryBuilder();
          qb.getMany = jest.fn().mockResolvedValue([
            { id: 1, email: 'worker@test.com', isActive: true, role: { name: 'worker' } },
          ]);
          userRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
          return userRepo;
        }
        return mockOrderRepository;
      });

      await notificationService.notifyInstallationTask(42);

      expect(EmailServiceMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ template: 'installation-new-task' })
      );
    });

    it('should skip when no worker recipients', async () => {
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === 'User' || (entity && entity.toString().includes('User'))) {
          const userRepo = createMockRepository();
          const qb = createMockQueryBuilder();
          qb.getMany = jest.fn().mockResolvedValue([]);
          userRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);
          return userRepo;
        }
        return mockOrderRepository;
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await notificationService.notifyInstallationTask(42);
      expect(EmailServiceMock.sendEmail).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});

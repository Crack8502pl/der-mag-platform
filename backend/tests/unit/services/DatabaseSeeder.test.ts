// tests/unit/services/DatabaseSeeder.test.ts
import { DatabaseSeeder } from '../../../src/services/DatabaseSeeder';
import { AppDataSource } from '../../../src/config/database';
import { Role } from '../../../src/entities/Role';
import { User } from '../../../src/entities/User';
import { TaskType } from '../../../src/entities/TaskType';
import bcrypt from 'bcrypt';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('DatabaseSeeder', () => {
  let mockRoleRepository: any;
  let mockUserRepository: any;
  let mockTaskTypeRepository: any;

  beforeEach(() => {
    // Mock console to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation();

    // Create mock repositories
    mockRoleRepository = {
      count: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
      findOne: jest.fn(),
    };

    mockUserRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    };

    mockTaskTypeRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === Role || entity?.name === 'Role') return mockRoleRepository;
      if (entity === User || entity?.name === 'User') return mockUserRepository;
      if (entity === TaskType || entity?.name === 'TaskType') return mockTaskTypeRepository;
      return {};
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('seed', () => {
    it('should skip seeding if roles already exist', async () => {
      mockRoleRepository.count.mockResolvedValue(1);

      await DatabaseSeeder.seed();

      expect(mockRoleRepository.count).toHaveBeenCalled();
      expect(mockRoleRepository.save).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('już zawiera dane'));
    });

    it('should seed all data when database is empty', async () => {
      mockRoleRepository.count.mockResolvedValue(0);
      mockRoleRepository.findOne.mockResolvedValue({ id: 1, name: 'admin' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      await DatabaseSeeder.seed();

      // Verify roles were seeded
      expect(mockRoleRepository.save).toHaveBeenCalledTimes(5);
      expect(mockRoleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'admin' })
      );

      // Verify task types were seeded
      expect(mockTaskTypeRepository.save).toHaveBeenCalledTimes(14);
      expect(mockTaskTypeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SERWIS' })
      );

      // Verify admin user was seeded
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'admin',
          email: 'r.krakowski@der-mag.pl',
          firstName: 'Administrator',
          lastName: 'Systemu',
        })
      );

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Seedowanie zakończone'));
    });

    it('should use ADMIN_EMAIL from environment if set', async () => {
      const customEmail = 'custom@test.pl';
      process.env.ADMIN_EMAIL = customEmail;

      mockRoleRepository.count.mockResolvedValue(0);
      mockRoleRepository.findOne.mockResolvedValue({ id: 1, name: 'admin' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      await DatabaseSeeder.seed();

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: customEmail,
        })
      );

      delete process.env.ADMIN_EMAIL;
    });

    it('should create all required roles', async () => {
      mockRoleRepository.count.mockResolvedValue(0);
      mockRoleRepository.findOne.mockResolvedValue({ id: 1, name: 'admin' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      await DatabaseSeeder.seed();

      const roleNames = ['admin', 'manager', 'coordinator', 'technician', 'viewer'];
      roleNames.forEach((roleName) => {
        expect(mockRoleRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ name: roleName })
        );
      });
    });

    it('should create all 14 task types including SERWIS', async () => {
      mockRoleRepository.count.mockResolvedValue(0);
      mockRoleRepository.findOne.mockResolvedValue({ id: 1, name: 'admin' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      await DatabaseSeeder.seed();

      const taskTypeCodes = [
        'SMW',
        'CSDIP',
        'LAN_PKP_PLK',
        'SMOK_IP_A',
        'SMOK_IP_B',
        'SSWIN',
        'SSP',
        'SUG',
        'OBIEKTY_KUBATUROWE',
        'KONTRAKTY_LINIOWE',
        'LAN_STRUKTURALNY',
        'ZASILANIA',
        'STRUKTURY_SWIATLO',
        'SERWIS',
      ];

      taskTypeCodes.forEach((code) => {
        expect(mockTaskTypeRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ code })
        );
      });
    });

    it('should throw error if admin role is not created', async () => {
      mockRoleRepository.count.mockResolvedValue(0);
      mockRoleRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      await expect(DatabaseSeeder.seed()).rejects.toThrow('Rola admin nie została utworzona');
    });
  });
});

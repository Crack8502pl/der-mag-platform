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

      // Verify roles were seeded (10 roles)
      expect(mockRoleRepository.save).toHaveBeenCalledTimes(10);
      expect(mockRoleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'admin' })
      );

      // Verify task types were seeded
      expect(mockTaskTypeRepository.save).toHaveBeenCalledTimes(13);
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

      const roleNames = [
        'admin',
        'management_board',
        'manager',
        'coordinator',
        'bom_editor',
        'prefabricator',
        'worker',
        'order_picking',
        'integrator',
        'viewer'
      ];
      roleNames.forEach((roleName) => {
        expect(mockRoleRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ name: roleName })
        );
      });
    });

    it('should create all 13 task types including SERWIS, SKD, CCTV', async () => {
      mockRoleRepository.count.mockResolvedValue(0);
      mockRoleRepository.findOne.mockResolvedValue({ id: 1, name: 'admin' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');

      await DatabaseSeeder.seed();

      const taskTypeCodes = [
        'SMW',
        'SDIP',
        'LAN',
        'SMOKIP_A',
        'SMOKIP_B',
        'SSWIN',
        'SSP',
        'SUG',
        'ZASILANIE',
        'OTK',
        'SKD',
        'CCTV',
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

  describe('forceSeed', () => {
    beforeEach(() => {
      mockRoleRepository.clear = jest.fn().mockResolvedValue({});
      mockUserRepository.clear = jest.fn().mockResolvedValue({});
      mockTaskTypeRepository.clear = jest.fn().mockResolvedValue({});
      mockRoleRepository.findOne.mockResolvedValue({ id: 1, name: 'admin' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      
      // Mock AppDataSource.query for TRUNCATE operations
      (AppDataSource as any).query = jest.fn().mockResolvedValue({});
    });

    it('should clear existing data and reseed', async () => {
      await DatabaseSeeder.forceSeed();

      // Verify TRUNCATE operations
      expect((AppDataSource as any).query).toHaveBeenCalledWith('SET session_replication_role = replica;');
      expect((AppDataSource as any).query).toHaveBeenCalledWith('TRUNCATE TABLE service_task_activities CASCADE');
      expect((AppDataSource as any).query).toHaveBeenCalledWith('TRUNCATE TABLE service_tasks CASCADE');
      expect((AppDataSource as any).query).toHaveBeenCalledWith('TRUNCATE TABLE brigade_members CASCADE');
      expect((AppDataSource as any).query).toHaveBeenCalledWith('TRUNCATE TABLE brigades CASCADE');
      expect((AppDataSource as any).query).toHaveBeenCalledWith('TRUNCATE TABLE subsystem_tasks CASCADE');
      expect((AppDataSource as any).query).toHaveBeenCalledWith('TRUNCATE TABLE bom_trigger_logs CASCADE');
      expect((AppDataSource as any).query).toHaveBeenCalledWith('TRUNCATE TABLE bom_triggers CASCADE');
      expect((AppDataSource as any).query).toHaveBeenCalledWith('TRUNCATE TABLE refresh_tokens CASCADE');
      expect((AppDataSource as any).query).toHaveBeenCalledWith('TRUNCATE TABLE audit_logs CASCADE');
      expect((AppDataSource as any).query).toHaveBeenCalledWith('SET session_replication_role = DEFAULT;');
      
      // Verify clear operations (not delete)
      expect(mockUserRepository.clear).toHaveBeenCalled();
      expect(mockRoleRepository.clear).toHaveBeenCalled();
      expect(mockTaskTypeRepository.clear).toHaveBeenCalled();

      // Verify seeding
      expect(mockRoleRepository.save).toHaveBeenCalledTimes(10);
      expect(mockTaskTypeRepository.save).toHaveBeenCalledTimes(13);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('WYMUSZONE SEEDOWANIE'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Dane usunięte'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Wymuszone seedowanie zakończone'));
    });

    it('should seed all 10 roles', async () => {
      await DatabaseSeeder.forceSeed();

      const expectedRoles = [
        'admin',
        'management_board',
        'manager',
        'coordinator',
        'bom_editor',
        'prefabricator',
        'worker',
        'order_picking',
        'integrator',
        'viewer'
      ];

      expectedRoles.forEach((roleName) => {
        expect(mockRoleRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ name: roleName })
        );
      });
    });

    it('should seed all 13 task types', async () => {
      await DatabaseSeeder.forceSeed();

      const taskTypeCodes = [
        'SMW',
        'SDIP',
        'LAN',
        'SMOKIP_A',
        'SMOKIP_B',
        'SSWIN',
        'SSP',
        'SUG',
        'ZASILANIE',
        'OTK',
        'SKD',
        'CCTV',
        'SERWIS',
      ];

      taskTypeCodes.forEach((code) => {
        expect(mockTaskTypeRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ code })
        );
      });
    });

    it('should create admin user with correct credentials', async () => {
      await DatabaseSeeder.forceSeed();

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'admin',
          firstName: 'Administrator',
          lastName: 'Systemu',
          active: true
        })
      );
    });
  });
});

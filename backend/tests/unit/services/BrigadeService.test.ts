// tests/unit/services/BrigadeService.test.ts
import { BrigadeService } from '../../../src/services/BrigadeService';
import { AppDataSource } from '../../../src/config/database';
import { Brigade } from '../../../src/entities/Brigade';
import { BrigadeMember } from '../../../src/entities/BrigadeMember';
import { User } from '../../../src/entities/User';
import { createMockRepository, createMockQueryBuilder } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../src/services/BrigadeNotificationService', () => ({
  __esModule: true,
  default: {
    notifyMemberRemoved: jest.fn().mockResolvedValue(undefined),
    notifyMemberAdded: jest.fn().mockResolvedValue(undefined),
    notifyBrigadeChanged: jest.fn().mockResolvedValue(undefined),
    notifyTaskAssigned: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('BrigadeService', () => {
  let service: BrigadeService;
  let mockBrigadeRepository: any;
  let mockMemberRepository: any;
  let mockUserRepository: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBrigadeRepository = createMockRepository<Brigade>();
    mockMemberRepository = createMockRepository<BrigadeMember>();
    mockUserRepository = createMockRepository<User>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      const name = typeof entity === 'function' ? entity.name : entity;
      if (name === 'Brigade') return mockBrigadeRepository;
      if (name === 'BrigadeMember') return mockMemberRepository;
      if (name === 'User') return mockUserRepository;
      return mockBrigadeRepository;
    });

    service = new BrigadeService();
  });

  describe('createBrigade', () => {
    it('should create a brigade successfully', async () => {
      const mockBrigade = { id: 1, code: 'BRG-01', name: 'Test Brigade', active: true } as Brigade;
      mockBrigadeRepository.findOne.mockResolvedValue(null);
      mockBrigadeRepository.create.mockReturnValue(mockBrigade);
      mockBrigadeRepository.save.mockResolvedValue(mockBrigade);

      const result = await service.createBrigade({
        code: 'BRG-01',
        name: 'Test Brigade',
      });

      expect(mockBrigadeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'BRG-01', name: 'Test Brigade', active: true })
      );
      expect(result).toEqual(mockBrigade);
    });

    it('should throw error when code already exists', async () => {
      mockBrigadeRepository.findOne.mockResolvedValue({ id: 1, code: 'BRG-01' });

      await expect(
        service.createBrigade({ code: 'BRG-01', name: 'Duplicate' })
      ).rejects.toThrow('Brygada z tym kodem już istnieje');
    });

    it('should use provided active value', async () => {
      const mockBrigade = { id: 1, code: 'BRG-02', active: false } as Brigade;
      mockBrigadeRepository.findOne.mockResolvedValue(null);
      mockBrigadeRepository.create.mockReturnValue(mockBrigade);
      mockBrigadeRepository.save.mockResolvedValue(mockBrigade);

      await service.createBrigade({ code: 'BRG-02', name: 'Inactive', active: false });

      expect(mockBrigadeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ active: false })
      );
    });
  });

  describe('getBrigadeById', () => {
    it('should return brigade when found', async () => {
      const mockBrigade = { id: 1, code: 'BRG-01', members: [] } as any;
      mockBrigadeRepository.findOne.mockResolvedValue(mockBrigade);

      const result = await service.getBrigadeById(1);

      expect(mockBrigadeRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } })
      );
      expect(result).toEqual(mockBrigade);
    });

    it('should return null when brigade not found', async () => {
      mockBrigadeRepository.findOne.mockResolvedValue(null);

      const result = await service.getBrigadeById(999);

      expect(result).toBeNull();
    });
  });

  describe('getBrigades', () => {
    it('should return brigades with default pagination', async () => {
      const mockBrigades = [{ id: 1 }, { id: 2 }] as Brigade[];
      const mockQb = createMockQueryBuilder<Brigade>();
      mockQb.getManyAndCount.mockResolvedValue([mockBrigades, 2]);
      mockBrigadeRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getBrigades();

      expect(result.brigades).toEqual(mockBrigades);
      expect(result.total).toBe(2);
      expect(mockQb.skip).toHaveBeenCalledWith(0);
      expect(mockQb.take).toHaveBeenCalledWith(20);
    });

    it('should apply active filter', async () => {
      const mockQb = createMockQueryBuilder<Brigade>();
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockBrigadeRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getBrigades({ active: true });

      expect(mockQb.andWhere).toHaveBeenCalledWith('brigade.active = :active', { active: true });
    });

    it('should apply pagination', async () => {
      const mockQb = createMockQueryBuilder<Brigade>();
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockBrigadeRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getBrigades({ page: 3, limit: 5 });

      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(5);
    });
  });

  describe('updateBrigade', () => {
    it('should update brigade successfully', async () => {
      const mockBrigade = { id: 1, code: 'BRG-01', name: 'Old Name', members: [] } as any;
      const updatedBrigade = { ...mockBrigade, name: 'New Name' };
      mockBrigadeRepository.findOne.mockResolvedValue(mockBrigade);
      mockBrigadeRepository.save.mockResolvedValue(updatedBrigade);

      const result = await service.updateBrigade(1, { name: 'New Name' } as Partial<Brigade>);

      expect(mockBrigadeRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedBrigade);
    });

    it('should throw error when brigade not found', async () => {
      mockBrigadeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateBrigade(999, { name: 'Test' } as Partial<Brigade>)
      ).rejects.toThrow('Brygada nie znaleziona');
    });

    it('should throw error when updating to a duplicate code', async () => {
      const mockBrigade = { id: 1, code: 'BRG-01', members: [] } as any;
      mockBrigadeRepository.findOne
        .mockResolvedValueOnce(mockBrigade) // getBrigadeById call
        .mockResolvedValueOnce({ id: 2, code: 'BRG-02' }); // code uniqueness check

      await expect(
        service.updateBrigade(1, { code: 'BRG-02' } as Partial<Brigade>)
      ).rejects.toThrow('Brygada z tym kodem już istnieje');
    });
  });

  describe('deleteBrigade', () => {
    it('should delete brigade successfully', async () => {
      const mockBrigade = { id: 1, members: [] } as any;
      mockBrigadeRepository.findOne.mockResolvedValue(mockBrigade);
      mockBrigadeRepository.remove.mockResolvedValue(undefined);

      await service.deleteBrigade(1);

      expect(mockBrigadeRepository.remove).toHaveBeenCalledWith(mockBrigade);
    });

    it('should throw error when brigade not found', async () => {
      mockBrigadeRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteBrigade(999)).rejects.toThrow('Brygada nie znaleziona');
    });
  });

  describe('addMember', () => {
    it('should add member to brigade successfully', async () => {
      const mockBrigade = { id: 1, members: [] } as any;
      mockBrigadeRepository.findOne.mockResolvedValue(mockBrigade);
      mockUserRepository.findOne.mockResolvedValue({ id: 5 } as User);

      const mockQb = createMockQueryBuilder<BrigadeMember>();
      mockQb.getOne.mockResolvedValue(null);
      mockMemberRepository.createQueryBuilder.mockReturnValue(mockQb);

      const mockMember = { id: 10, brigadeId: 1, userId: 5 } as BrigadeMember;
      mockMemberRepository.create.mockReturnValue(mockMember);
      mockMemberRepository.save.mockResolvedValue(mockMember);

      const result = await service.addMember({
        brigadeId: 1,
        userId: 5,
        workDays: [1, 2, 3, 4, 5],
        validFrom: new Date('2024-01-01'),
      });

      expect(mockMemberRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockMember);
    });

    it('should throw error when brigade not found', async () => {
      mockBrigadeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addMember({
          brigadeId: 999,
          userId: 1,
          workDays: [1],
          validFrom: new Date(),
        })
      ).rejects.toThrow('Brygada nie znaleziona');
    });

    it('should throw error when user not found', async () => {
      mockBrigadeRepository.findOne.mockResolvedValue({ id: 1, members: [] } as any);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addMember({
          brigadeId: 1,
          userId: 999,
          workDays: [1],
          validFrom: new Date(),
        })
      ).rejects.toThrow('Użytkownik nie znaleziony');
    });

    it('should throw error when overlapping membership exists', async () => {
      const mockBrigade = { id: 1, members: [] } as any;
      mockBrigadeRepository.findOne.mockResolvedValue(mockBrigade);
      mockUserRepository.findOne.mockResolvedValue({ id: 5 } as User);

      const mockQb = createMockQueryBuilder<BrigadeMember>();
      mockQb.getOne.mockResolvedValue({ id: 99 } as BrigadeMember);
      mockMemberRepository.createQueryBuilder.mockReturnValue(mockQb);

      await expect(
        service.addMember({
          brigadeId: 1,
          userId: 5,
          workDays: [1, 2],
          validFrom: new Date(),
        })
      ).rejects.toThrow('nakładającym się okresie czasu');
    });

    it('should enforce single-brigade constraint: reject member active in a different brigade', async () => {
      const mockBrigade = { id: 2, members: [] } as any;
      mockBrigadeRepository.findOne.mockResolvedValue(mockBrigade);
      mockUserRepository.findOne.mockResolvedValue({ id: 5 } as User);

      const mockQb = createMockQueryBuilder<BrigadeMember>();
      // Simulate user already active in brigade 1 (different brigade)
      mockQb.getOne.mockResolvedValue({ id: 88, brigadeId: 1, userId: 5 } as BrigadeMember);
      mockMemberRepository.createQueryBuilder.mockReturnValue(mockQb);

      await expect(
        service.addMember({
          brigadeId: 2,
          userId: 5,
          workDays: [1, 2],
          validFrom: new Date(),
        })
      ).rejects.toThrow('nakładającym się okresie czasu');

      // Verify the overlap check is NOT scoped to a specific brigade
      expect(mockQb.where).not.toHaveBeenCalledWith(
        expect.stringContaining('brigadeId'),
        expect.anything()
      );
      // Verify it does check by userId
      expect(mockQb.where).toHaveBeenCalledWith('member.userId = :userId', { userId: 5 });
    });
  });

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      const mockMember = {
        id: 10,
        userId: 5,
        brigadeId: 1,
        brigade: { serviceTasks: [] },
      } as any;
      mockMemberRepository.findOne.mockResolvedValue(mockMember);
      mockMemberRepository.remove.mockResolvedValue(undefined);

      await service.removeMember(10);

      expect(mockMemberRepository.remove).toHaveBeenCalledWith(mockMember);
    });

    it('should throw error when member not found', async () => {
      mockMemberRepository.findOne.mockResolvedValue(null);

      await expect(service.removeMember(999)).rejects.toThrow('Członek brygady nie znaleziony');
    });
  });

  describe('getBrigadeMembers', () => {
    it('should return members for a brigade', async () => {
      const mockMembers = [{ id: 1 }, { id: 2 }] as BrigadeMember[];
      const mockQb = createMockQueryBuilder<BrigadeMember>();
      mockQb.getMany.mockResolvedValue(mockMembers);
      mockMemberRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getBrigadeMembers(1);

      expect(result).toEqual(mockMembers);
    });

    it('should apply active filter when provided', async () => {
      const mockQb = createMockQueryBuilder<BrigadeMember>();
      mockQb.getMany.mockResolvedValue([]);
      mockMemberRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getBrigadeMembers(1, { active: true });

      expect(mockQb.andWhere).toHaveBeenCalledWith('member.active = :active', { active: true });
    });
  });

  describe('getUserBrigades', () => {
    it('should return brigades for a user', async () => {
      const mockMembers = [
        { id: 1, userId: 5, active: true, brigade: { id: 1, name: 'Brygada 1' } },
      ];
      mockMemberRepository.find.mockResolvedValue(mockMembers);

      const result = await service.getUserBrigades(5);
      expect(result).toHaveLength(1);
      expect(mockMemberRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 5, active: true } })
      );
    });
  });

  describe('getBrigadeStatistics', () => {
    it('should return statistics for a brigade', async () => {
      const mockBrigade = {
        id: 1,
        members: [
          { id: 1, active: true },
          { id: 2, active: false },
        ],
        serviceTasks: [{ id: 1 }, { id: 2 }, { id: 3 }],
      };
      mockBrigadeRepository.findOne.mockResolvedValue(mockBrigade);

      const result = await service.getBrigadeStatistics(1);
      expect(result.totalMembers).toBe(2);
      expect(result.activeMembers).toBe(1);
      expect(result.tasksCount).toBe(3);
    });

    it('should throw when brigade not found', async () => {
      mockBrigadeRepository.findOne.mockResolvedValue(null);
      await expect(service.getBrigadeStatistics(99)).rejects.toThrow('Brygada nie znaleziona');
    });
  });
});

// tests/unit/services/SubsystemService.test.ts
import { SubsystemService } from '../../../src/services/SubsystemService';
import { AppDataSource } from '../../../src/config/database';
import { Subsystem, SystemType, SubsystemStatus } from '../../../src/entities/Subsystem';
import { Contract } from '../../../src/entities/Contract';
import { createMockRepository, createMockQueryBuilder } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('SubsystemService', () => {
  let subsystemService: SubsystemService;
  let mockSubsystemRepository: any;
  let mockContractRepository: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSubsystemRepository = createMockRepository<Subsystem>();
    mockContractRepository = createMockRepository<Contract>();
    mockQueryBuilder = createMockQueryBuilder<Subsystem>();

    mockSubsystemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Contract) return mockContractRepository;
      return mockSubsystemRepository;
    });

    subsystemService = new SubsystemService();
  });

  describe('generateSubsystemNumber', () => {
    it('should generate first subsystem number P00001MMYY when none exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await subsystemService.generateSubsystemNumber();
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear().toString().slice(-2);
      expect(result).toBe(`P00001${month}${year}`);
    });

    it('should increment the sequence number for existing subsystems', async () => {
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear().toString().slice(-2);

      mockQueryBuilder.getOne.mockResolvedValue({
        subsystemNumber: `P00003${month}${year}`,
      });

      const result = await subsystemService.generateSubsystemNumber();
      expect(result).toBe(`P00004${month}${year}`);
    });

    it('should throw error when max number exceeded', async () => {
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear().toString().slice(-2);

      mockQueryBuilder.getOne.mockResolvedValue({
        subsystemNumber: `P99999${month}${year}`,
      });

      await expect(subsystemService.generateSubsystemNumber()).rejects.toThrow(
        `Osiągnięto maksymalną liczbę podsystemów dla miesiąca ${month}/${year}`
      );
    });
  });

  describe('validateSubsystemNumber', () => {
    it('should return true for valid subsystem number', () => {
      expect(subsystemService.validateSubsystemNumber('P000010125')).toBe(true);
      expect(subsystemService.validateSubsystemNumber('P999991225')).toBe(true);
    });

    it('should return false for invalid formats', () => {
      expect(subsystemService.validateSubsystemNumber('R0000001_A')).toBe(false);
      expect(subsystemService.validateSubsystemNumber('P1234')).toBe(false);
      expect(subsystemService.validateSubsystemNumber('')).toBe(false);
      expect(subsystemService.validateSubsystemNumber('INVALID')).toBe(false);
    });
  });

  describe('createSubsystem', () => {
    it('should create subsystem successfully', async () => {
      const mockContract = { id: 1, contractNumber: 'R0000001_A' };
      mockContractRepository.findOne.mockResolvedValue(mockContract);

      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear().toString().slice(-2);
      const expectedNumber = `P00001${month}${year}`;

      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockSubsystemRepository.findOne.mockResolvedValue(null);

      const mockSubsystem = {
        id: 1,
        subsystemNumber: expectedNumber,
        systemType: SystemType.SMOKIP_A,
        contractId: 1,
        status: SubsystemStatus.CREATED,
      };
      mockSubsystemRepository.create.mockReturnValue(mockSubsystem);
      mockSubsystemRepository.save.mockResolvedValue(mockSubsystem);

      const result = await subsystemService.createSubsystem({
        contractId: 1,
        systemType: SystemType.SMOKIP_A,
      });

      expect(result).toEqual(mockSubsystem);
      expect(mockSubsystemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ contractId: 1, systemType: SystemType.SMOKIP_A })
      );
    });

    it('should throw when contract not found', async () => {
      mockContractRepository.findOne.mockResolvedValue(null);

      await expect(
        subsystemService.createSubsystem({ contractId: 99, systemType: SystemType.SMOKIP_A })
      ).rejects.toThrow('Kontrakt nie znaleziony');
    });
  });

  describe('getSubsystemById', () => {
    it('should return subsystem when found', async () => {
      const mockSubsystem = { id: 1, subsystemNumber: 'P000010125' };
      mockSubsystemRepository.findOne.mockResolvedValue(mockSubsystem);

      const result = await subsystemService.getSubsystemById(1);
      expect(result).toEqual(mockSubsystem);
    });

    it('should return null when not found', async () => {
      mockSubsystemRepository.findOne.mockResolvedValue(null);

      const result = await subsystemService.getSubsystemById(99);
      expect(result).toBeNull();
    });
  });

  describe('getSubsystemsByContract', () => {
    it('should return all subsystems for a contract', async () => {
      const mockSubsystems = [
        { id: 1, subsystemNumber: 'P000010125', contractId: 1 },
        { id: 2, subsystemNumber: 'P000020125', contractId: 1 },
      ];
      mockSubsystemRepository.find.mockResolvedValue(mockSubsystems);

      const result = await subsystemService.getSubsystemsByContract(1);

      expect(mockSubsystemRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { contractId: 1 } })
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no subsystems exist for contract', async () => {
      mockSubsystemRepository.find.mockResolvedValue([]);

      const result = await subsystemService.getSubsystemsByContract(99);
      expect(result).toEqual([]);
    });
  });

  describe('getSubsystemByNumber', () => {
    it('should return subsystem by number', async () => {
      const mockSubsystem = { id: 1, subsystemNumber: 'P000010125' };
      mockSubsystemRepository.findOne.mockResolvedValue(mockSubsystem);

      const result = await subsystemService.getSubsystemByNumber('P000010125');
      expect(result).toEqual(mockSubsystem);
    });

    it('should return null when not found', async () => {
      mockSubsystemRepository.findOne.mockResolvedValue(null);
      const result = await subsystemService.getSubsystemByNumber('NOTEXIST');
      expect(result).toBeNull();
    });
  });

  describe('updateSubsystem', () => {
    it('should update and return the subsystem', async () => {
      const existing = { id: 1, subsystemNumber: 'P000010125', systemType: SystemType.SMOKIP_A };
      const updated = { ...existing, systemType: SystemType.SMW };
      mockSubsystemRepository.findOne.mockResolvedValue(existing);
      mockSubsystemRepository.save.mockResolvedValue(updated);

      const result = await subsystemService.updateSubsystem(1, { systemType: SystemType.SMW } as any);
      expect(result.systemType).toBe(SystemType.SMW);
    });

    it('should throw when subsystem not found', async () => {
      mockSubsystemRepository.findOne.mockResolvedValue(null);
      await expect(subsystemService.updateSubsystem(99, {} as any)).rejects.toThrow('Podsystem nie znaleziony');
    });

    it('should throw when trying to change subsystemNumber', async () => {
      const existing = { id: 1, subsystemNumber: 'P000010125' };
      mockSubsystemRepository.findOne.mockResolvedValue(existing);

      await expect(
        subsystemService.updateSubsystem(1, { subsystemNumber: 'P000020125' } as any)
      ).rejects.toThrow('Nie można zmienić numeru podsystemu');
    });
  });

  describe('deleteSubsystem', () => {
    it('should delete subsystem in CREATED status', async () => {
      const subsystem = { id: 1, subsystemNumber: 'P000010125', status: SubsystemStatus.CREATED };
      mockSubsystemRepository.findOne.mockResolvedValue(subsystem);
      mockSubsystemRepository.remove.mockResolvedValue(undefined);

      await subsystemService.deleteSubsystem(1);
      expect(mockSubsystemRepository.remove).toHaveBeenCalledWith(subsystem);
    });

    it('should throw when subsystem not in CREATED status', async () => {
      const subsystem = { id: 1, status: SubsystemStatus.BOM_GENERATED };
      mockSubsystemRepository.findOne.mockResolvedValue(subsystem);

      await expect(subsystemService.deleteSubsystem(1)).rejects.toThrow('CREATED');
    });

    it('should throw when subsystem not found', async () => {
      mockSubsystemRepository.findOne.mockResolvedValue(null);
      await expect(subsystemService.deleteSubsystem(99)).rejects.toThrow('Podsystem nie znaleziony');
    });
  });

  describe('updateStatus', () => {
    it('should update subsystem status', async () => {
      const subsystem = { id: 1, status: SubsystemStatus.CREATED };
      const updated = { ...subsystem, status: SubsystemStatus.BOM_GENERATED };
      mockSubsystemRepository.findOne.mockResolvedValue(subsystem);
      mockSubsystemRepository.save.mockResolvedValue(updated);

      const result = await subsystemService.updateStatus(1, SubsystemStatus.BOM_GENERATED);
      expect(result.status).toBe(SubsystemStatus.BOM_GENERATED);
    });

    it('should throw when subsystem not found', async () => {
      mockSubsystemRepository.findOne.mockResolvedValue(null);
      await expect(subsystemService.updateStatus(99, SubsystemStatus.BOM_GENERATED)).rejects.toThrow('Podsystem nie znaleziony');
    });
  });
});

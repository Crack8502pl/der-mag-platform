import { NetworkAllocationService } from '../../../src/services/NetworkAllocationService';
import { AppDataSource } from '../../../src/config/database';
import { NetworkAllocation } from '../../../src/entities/NetworkAllocation';
import { NetworkPool } from '../../../src/entities/NetworkPool';
import { Subsystem, SystemType } from '../../../src/entities/Subsystem';
import { Contract } from '../../../src/entities/Contract';
import { createMockQueryBuilder, createMockRepository } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('NetworkAllocationService', () => {
  let service: NetworkAllocationService;
  let mockAllocationRepo: any;
  let mockPoolRepo: any;
  let mockSubsystemRepo: any;
  let mockContractRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAllocationRepo = createMockRepository<NetworkAllocation>();
    mockPoolRepo = createMockRepository<NetworkPool>();
    mockSubsystemRepo = createMockRepository<Subsystem>();
    mockContractRepo = createMockRepository<Contract>();

    mockAllocationRepo.create.mockImplementation((data: any) => data);

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === NetworkAllocation) return mockAllocationRepo;
      if (entity === NetworkPool) return mockPoolRepo;
      if (entity === Subsystem) return mockSubsystemRepo;
      if (entity === Contract) return mockContractRepo;
      return createMockRepository();
    });

    service = new NetworkAllocationService();
  });

  describe('allocateNetwork', () => {
    it('creates a new allocation with calculated /24 network values', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue({ id: 1, contractId: 9, systemType: SystemType.CCTV, contract: { id: 9 } });
      mockAllocationRepo.findOne.mockResolvedValue(null);
      mockSubsystemRepo.find.mockResolvedValue([]);
      mockPoolRepo.find.mockResolvedValue([{ id: 3, cidrRange: '172.16.0.0/12', isActive: true, priority: 1 }]);
      mockAllocationRepo.find.mockResolvedValue([]);
      mockAllocationRepo.save.mockImplementation(async (value: any) => ({ id: 50, ...value }));

      const result = await service.allocateNetwork(1);

      expect(mockAllocationRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        subsystemId: 1,
        contractId: 9,
        poolId: 3,
        allocatedRange: '172.16.0.0/24',
        gateway: '172.16.0.1',
        subnetMask: '255.255.255.0',
        ntpServer: '172.16.0.2',
        firstUsableIP: '172.16.0.3',
        lastUsableIP: '172.16.0.254',
        totalHosts: 254,
      }));
      expect(result).toEqual(expect.objectContaining({ id: 50, gateway: '172.16.0.1' }));
    });

    it('shares an existing allocation with sibling subsystem of same type', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue({ id: 1, contractId: 9, systemType: SystemType.CCTV, contract: { id: 9 } });
      mockAllocationRepo.findOne.mockResolvedValue(null);
      mockSubsystemRepo.find.mockResolvedValue([
        {
          id: 2,
          networkAllocation: {
            poolId: 4,
            allocatedRange: '172.16.5.0/24',
            gateway: '172.16.5.1',
            subnetMask: '255.255.255.0',
            ntpServer: '172.16.5.2',
            firstUsableIP: '172.16.5.3',
            lastUsableIP: '172.16.5.254',
            totalHosts: 254,
          },
        },
      ]);
      mockAllocationRepo.save.mockImplementation(async (value: any) => value);

      const result = await service.allocateNetwork(1);

      expect(mockAllocationRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        poolId: 4,
        allocatedRange: '172.16.5.0/24',
        gateway: '172.16.5.1',
        usedHosts: 0,
      }));
      expect(result.gateway).toBe('172.16.5.1');
    });

    it('throws when subsystem does not exist', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue(null);

      await expect(service.allocateNetwork(1)).rejects.toThrow('Podsystem nie znaleziony');
    });

    it('throws when subsystem already has an allocation', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue({ id: 1, contractId: 9, systemType: SystemType.CCTV, contract: { id: 9 } });
      mockAllocationRepo.findOne.mockResolvedValue({ id: 10, subsystemId: 1 });

      await expect(service.allocateNetwork(1)).rejects.toThrow('Podsystem już ma przydzieloną sieć');
    });

    it('throws when there are no active pools', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue({ id: 1, contractId: 9, systemType: SystemType.CCTV, contract: { id: 9 } });
      mockAllocationRepo.findOne.mockResolvedValue(null);
      mockSubsystemRepo.find.mockResolvedValue([]);
      mockPoolRepo.find.mockResolvedValue([]);

      await expect(service.allocateNetwork(1)).rejects.toThrow('Brak aktywnych pul IP');
    });

    it('uses next available subnet based on existing allocations count', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue({ id: 1, contractId: 9, systemType: SystemType.CCTV, contract: { id: 9 } });
      mockAllocationRepo.findOne.mockResolvedValue(null);
      mockSubsystemRepo.find.mockResolvedValue([]);
      mockPoolRepo.find.mockResolvedValue([{ id: 3, cidrRange: '172.16.0.0/12', isActive: true, priority: 1 }]);
      mockAllocationRepo.find.mockResolvedValue([{ id: 100 }, { id: 101 }]);
      mockAllocationRepo.save.mockImplementation(async (value: any) => value);

      const result = await service.allocateNetwork(1);

      expect(result.allocatedRange).toBe('172.16.2.0/24');
      expect(result.gateway).toBe('172.16.2.1');
    });
  });

  describe('getAllocationById', () => {
    it('returns allocation with relations', async () => {
      mockAllocationRepo.findOne.mockResolvedValue({ id: 1 });

      const result = await service.getAllocationById(1);

      expect(mockAllocationRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['subsystem', 'contract', 'pool', 'deviceAssignments'],
      });
      expect(result).toEqual({ id: 1 });
    });

    it('returns null when allocation is missing', async () => {
      mockAllocationRepo.findOne.mockResolvedValue(null);

      await expect(service.getAllocationById(99)).resolves.toBeNull();
    });
  });

  describe('getAllocationBySubsystem', () => {
    it('returns allocation for subsystem', async () => {
      mockAllocationRepo.findOne.mockResolvedValue({ id: 2, subsystemId: 5 });

      const result = await service.getAllocationBySubsystem(5);

      expect(mockAllocationRepo.findOne).toHaveBeenCalledWith({
        where: { subsystemId: 5 },
        relations: ['pool', 'deviceAssignments'],
      });
      expect(result).toEqual({ id: 2, subsystemId: 5 });
    });

    it('returns null when subsystem has no allocation', async () => {
      mockAllocationRepo.findOne.mockResolvedValue(null);

      await expect(service.getAllocationBySubsystem(5)).resolves.toBeNull();
    });
  });

  describe('getAllAllocations', () => {
    it('returns all allocations without contract filter', async () => {
      const queryBuilder = createMockQueryBuilder<NetworkAllocation>();
      queryBuilder.getMany.mockResolvedValue([{ id: 1 } as NetworkAllocation]);
      mockAllocationRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getAllAllocations();

      expect(queryBuilder.where).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 1 }]);
    });

    it('applies contract filter when provided', async () => {
      const queryBuilder = createMockQueryBuilder<NetworkAllocation>();
      queryBuilder.getMany.mockResolvedValue([]);
      mockAllocationRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.getAllAllocations(12);

      expect(queryBuilder.where).toHaveBeenCalledWith('allocation.contractId = :contractId', { contractId: 12 });
    });
  });
});

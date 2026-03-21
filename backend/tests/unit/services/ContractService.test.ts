// tests/unit/services/ContractService.test.ts
import { ContractService } from '../../../src/services/ContractService';
import { AppDataSource } from '../../../src/config/database';
import { Contract, ContractStatus } from '../../../src/entities/Contract';
import { createMockRepository, createMockQueryBuilder } from '../../mocks/database.mock';

// Mock the database
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('ContractService', () => {
  let contractService: ContractService;
  let mockContractRepository: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContractRepository = createMockRepository<Contract>();
    mockQueryBuilder = createMockQueryBuilder<Contract>();

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockContractRepository);
    mockContractRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    contractService = new ContractService();
  });

  describe('getAllContracts', () => {
    it('should return paginated contracts with default options', async () => {
      const mockContracts = [
        {
          id: 1,
          contractNumber: 'R0000001_A',
          customName: 'Test Contract 1',
          status: ContractStatus.CREATED,
        },
        {
          id: 2,
          contractNumber: 'R0000002_A',
          customName: 'Test Contract 2',
          status: ContractStatus.APPROVED,
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockContracts, 2]);

      const result = await contractService.getAllContracts();

      expect(mockContractRepository.createQueryBuilder).toHaveBeenCalledWith('contract');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('contract.projectManager', 'projectManager');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('contract.subsystems', 'subsystems');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('contract.createdAt', 'DESC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);

      expect(result).toEqual({
        contracts: mockContracts,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply sorting by contractNumber ascending', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await contractService.getAllContracts({}, {
        sortBy: 'contractNumber',
        sortOrder: 'ASC',
      });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('contract.contractNumber', 'ASC');
    });

    it('should apply sorting by orderDate descending', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await contractService.getAllContracts({}, {
        sortBy: 'orderDate',
        sortOrder: 'DESC',
      });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('contract.orderDate', 'DESC');
    });

    it('should apply sorting by customName', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await contractService.getAllContracts({}, {
        sortBy: 'customName',
        sortOrder: 'ASC',
      });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('contract.customName', 'ASC');
    });

    it('should fallback to createdAt for invalid sort field', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await contractService.getAllContracts({}, {
        sortBy: 'invalidField',
        sortOrder: 'ASC',
      });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('contract.createdAt', 'ASC');
    });

    it('should handle pagination correctly for page 2', async () => {
      const mockContracts = Array(50).fill(null).map((_, i) => ({
        id: i + 51,
        contractNumber: `R${String(i + 51).padStart(7, '0')}_A`,
        customName: `Contract ${i + 51}`,
      }));

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockContracts, 150]);

      const result = await contractService.getAllContracts({}, {
        page: 2,
        limit: 50,
      });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(50);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);

      expect(result).toEqual({
        contracts: mockContracts,
        total: 150,
        page: 2,
        limit: 50,
        totalPages: 3,
      });
    });

    it('should enforce minimum page of 1', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await contractService.getAllContracts({}, {
        page: -5,
      });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
    });

    it('should enforce maximum limit of 100', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await contractService.getAllContracts({}, {
        limit: 500,
      });

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
    });

    it('should enforce minimum limit of 1', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await contractService.getAllContracts({}, {
        limit: -5,
      });

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(1);
    });

    it('should filter by status', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await contractService.getAllContracts({
        status: ContractStatus.APPROVED,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'contract.status = :status',
        { status: ContractStatus.APPROVED }
      );
    });

    it('should filter by projectManagerId', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await contractService.getAllContracts({
        projectManagerId: 5,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'contract.projectManagerId = :projectManagerId',
        { projectManagerId: 5 }
      );
    });

    it('should apply multiple filters simultaneously', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await contractService.getAllContracts({
        status: ContractStatus.IN_PROGRESS,
        projectManagerId: 3,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'contract.status = :status',
        { status: ContractStatus.IN_PROGRESS }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'contract.projectManagerId = :projectManagerId',
        { projectManagerId: 3 }
      );
    });

    it('should combine filters, sorting and pagination', async () => {
      const mockContracts = [
        {
          id: 10,
          contractNumber: 'R0000010_A',
          customName: 'Filtered Contract',
          status: ContractStatus.COMPLETED,
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockContracts, 25]);

      const result = await contractService.getAllContracts(
        {
          status: ContractStatus.COMPLETED,
          projectManagerId: 7,
        },
        {
          sortBy: 'contractNumber',
          sortOrder: 'ASC',
          page: 3,
          limit: 10,
        }
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'contract.status = :status',
        { status: ContractStatus.COMPLETED }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'contract.projectManagerId = :projectManagerId',
        { projectManagerId: 7 }
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('contract.contractNumber', 'ASC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);

      expect(result).toEqual({
        contracts: mockContracts,
        total: 25,
        page: 3,
        limit: 10,
        totalPages: 3,
      });
    });

    it('should calculate totalPages correctly', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 47]);

      const result = await contractService.getAllContracts({}, {
        page: 1,
        limit: 10,
      });

      expect(result.totalPages).toBe(5); // 47 / 10 = 4.7, ceil = 5
    });

    it('should handle zero total contracts', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await contractService.getAllContracts();

      expect(result).toEqual({
        contracts: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });
  });

  describe('generateContractNumber', () => {
    it('should generate first contract number R0000001_A when no contracts exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockContractRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await contractService.generateContractNumber();
      expect(result).toBe('R0000001_A');
    });

    it('should increment existing contract number', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ contractNumber: 'R0000005_A' });
      mockContractRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await contractService.generateContractNumber();
      expect(result).toBe('R0000006_A');
    });
  });

  describe('createContract', () => {
    it('should create a contract with generated number', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockContractRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockContractRepository.findOne.mockResolvedValue(null);

      const mockUser = { id: 1, username: 'manager' };
      const mockContract = { id: 1, contractNumber: 'R0000001_A', customName: 'Test', status: 'CREATED' };
      mockContractRepository.create.mockReturnValue(mockContract);
      mockContractRepository.save.mockResolvedValue(mockContract);

      const mockUserRepository = createMockRepository();
      mockUserRepository.findOne = jest.fn().mockResolvedValue(mockUser);
      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
        if (entity.name === 'User' || (entity && entity.toString().includes('User'))) {
          return mockUserRepository;
        }
        return mockContractRepository;
      });

      const result = await contractService.createContract({
        customName: 'Test',
        orderDate: new Date('2026-01-01'),
        managerCode: 'ABC',
        projectManagerId: 1,
      });

      expect(result).toEqual(mockContract);
    });

    it('should throw on duplicate contract number', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockContractRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockContractRepository.findOne.mockResolvedValue({ id: 1, contractNumber: 'R0000001_A' });

      await expect(
        contractService.createContract({
          contractNumber: 'R0000001_A',
          customName: 'Test',
          orderDate: new Date('2026-01-01'),
          managerCode: 'ABC',
          projectManagerId: 1,
        })
      ).rejects.toThrow('już istnieje');
    });
  });

  describe('getContractById', () => {
    it('should return a contract when found', async () => {
      const mockContract = { id: 1, contractNumber: 'R0000001_A' };
      mockContractRepository.findOne.mockResolvedValue(mockContract);

      const result = await contractService.getContractById(1);
      expect(result).toEqual(mockContract);
    });

    it('should return null when not found', async () => {
      mockContractRepository.findOne.mockResolvedValue(null);

      const result = await contractService.getContractById(99);
      expect(result).toBeNull();
    });
  });

  describe('getContractByNumber', () => {
    it('should return a contract by number', async () => {
      const mockContract = { id: 1, contractNumber: 'R0000001_A' };
      mockContractRepository.findOne.mockResolvedValue(mockContract);

      const result = await contractService.getContractByNumber('R0000001_A');
      expect(result).toEqual(mockContract);
    });

    it('should return null when not found', async () => {
      mockContractRepository.findOne.mockResolvedValue(null);

      const result = await contractService.getContractByNumber('R9999999_Z');
      expect(result).toBeNull();
    });
  });

  describe('updateContract', () => {
    it('should update and return the contract', async () => {
      const existing = { id: 1, contractNumber: 'R0000001_A', customName: 'Old', subsystems: [] };
      const updated = { ...existing, customName: 'New' };
      mockContractRepository.findOne.mockResolvedValue(existing);
      mockContractRepository.save.mockResolvedValue(updated);

      const result = await contractService.updateContract(1, { customName: 'New' } as any);
      expect(result.customName).toBe('New');
    });

    it('should throw when contract not found', async () => {
      mockContractRepository.findOne.mockResolvedValue(null);

      await expect(contractService.updateContract(99, {} as any)).rejects.toThrow('Kontrakt nie znaleziony');
    });
  });

  describe('approveContract', () => {
    it('should approve a contract in CREATED status', async () => {
      const existing = { id: 1, contractNumber: 'R0000001_A', status: 'CREATED', subsystems: [] };
      const approved = { ...existing, status: 'APPROVED' };
      mockContractRepository.findOne.mockResolvedValue(existing);
      mockContractRepository.save.mockResolvedValue(approved);

      const result = await contractService.approveContract(1);
      expect(result.status).toBe('APPROVED');
    });

    it('should throw when contract status is not CREATED', async () => {
      mockContractRepository.findOne.mockResolvedValue({ id: 1, status: 'APPROVED', subsystems: [] });

      await expect(contractService.approveContract(1)).rejects.toThrow('CREATED');
    });

    it('should throw when contract not found', async () => {
      mockContractRepository.findOne.mockResolvedValue(null);

      await expect(contractService.approveContract(99)).rejects.toThrow('Kontrakt nie znaleziony');
    });
  });

  describe('deleteContract', () => {
    it('should delete a contract with no subsystems', async () => {
      const contract = { id: 1, contractNumber: 'R0000001_A', subsystems: [] };
      mockContractRepository.findOne.mockResolvedValue(contract);
      mockContractRepository.remove.mockResolvedValue(undefined);

      await expect(contractService.deleteContract(1)).resolves.toBeUndefined();
      expect(mockContractRepository.remove).toHaveBeenCalledWith(contract);
    });

    it('should throw when contract not found', async () => {
      mockContractRepository.findOne.mockResolvedValue(null);

      await expect(contractService.deleteContract(99)).rejects.toThrow('Kontrakt nie znaleziony');
    });
  });

  describe('getStats', () => {
    it('should return contract stats grouped by status', async () => {
      mockContractRepository.find.mockResolvedValue([
        { status: 'CREATED' },
        { status: 'CREATED' },
        { status: 'APPROVED' },
      ]);

      const result = await contractService.getStats();
      expect(result.total).toBe(3);
      expect(result.byStatus['CREATED']).toBe(2);
      expect(result.byStatus['APPROVED']).toBe(1);
    });
  });
});

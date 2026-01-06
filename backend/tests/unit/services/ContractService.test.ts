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
});

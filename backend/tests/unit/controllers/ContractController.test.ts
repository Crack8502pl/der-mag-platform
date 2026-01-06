// tests/unit/controllers/ContractController.test.ts
import { Request, Response } from 'express';
import { ContractController } from '../../../src/controllers/ContractController';
import { ContractService } from '../../../src/services/ContractService';
import { ContractStatus } from '../../../src/entities/Contract';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';

// Mock the ContractService
jest.mock('../../../src/services/ContractService');

describe('ContractController', () => {
  let contractController: ContractController;
  let mockContractService: jest.Mocked<ContractService>;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create a new controller instance
    contractController = new ContractController();
    
    // Get the mocked service
    mockContractService = contractController['contractService'] as jest.Mocked<ContractService>;

    // Create mock request and response
    req = createMockRequest();
    res = createMockResponse();
  });

  describe('getContracts', () => {
    it('should return paginated contracts with default parameters', async () => {
      const mockResult = {
        contracts: [
          {
            id: 1,
            contractNumber: 'R0000001_1',
            customName: 'Test Contract',
            status: ContractStatus.CREATED,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockContractService.getAllContracts = jest.fn().mockResolvedValue(mockResult);

      req.query = {};

      await contractController.getContracts(req as Request, res as Response);

      expect(mockContractService.getAllContracts).toHaveBeenCalledWith({}, {
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        page: 1,
        limit: 20,
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.contracts,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should handle custom sorting parameters', async () => {
      const mockResult = {
        contracts: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      mockContractService.getAllContracts = jest.fn().mockResolvedValue(mockResult);

      req.query = {
        sortBy: 'contractNumber',
        sortOrder: 'ASC',
      };

      await contractController.getContracts(req as Request, res as Response);

      expect(mockContractService.getAllContracts).toHaveBeenCalledWith({}, {
        sortBy: 'contractNumber',
        sortOrder: 'ASC',
        page: 1,
        limit: 20,
      });
    });

    it('should handle custom pagination parameters', async () => {
      const mockResult = {
        contracts: [],
        total: 100,
        page: 2,
        limit: 50,
        totalPages: 2,
      };

      mockContractService.getAllContracts = jest.fn().mockResolvedValue(mockResult);

      req.query = {
        page: '2',
        limit: '50',
      };

      await contractController.getContracts(req as Request, res as Response);

      expect(mockContractService.getAllContracts).toHaveBeenCalledWith({}, {
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        page: 2,
        limit: 50,
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.contracts,
        pagination: {
          page: 2,
          limit: 50,
          total: 100,
          totalPages: 2,
        },
      });
    });

    it('should handle status filter', async () => {
      const mockResult = {
        contracts: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      mockContractService.getAllContracts = jest.fn().mockResolvedValue(mockResult);

      req.query = {
        status: ContractStatus.APPROVED,
      };

      await contractController.getContracts(req as Request, res as Response);

      expect(mockContractService.getAllContracts).toHaveBeenCalledWith(
        { status: ContractStatus.APPROVED },
        {
          sortBy: 'createdAt',
          sortOrder: 'DESC',
          page: 1,
          limit: 20,
        }
      );
    });

    it('should handle projectManagerId filter', async () => {
      const mockResult = {
        contracts: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      mockContractService.getAllContracts = jest.fn().mockResolvedValue(mockResult);

      req.query = {
        projectManagerId: '5',
      };

      await contractController.getContracts(req as Request, res as Response);

      expect(mockContractService.getAllContracts).toHaveBeenCalledWith(
        { projectManagerId: 5 },
        {
          sortBy: 'createdAt',
          sortOrder: 'DESC',
          page: 1,
          limit: 20,
        }
      );
    });

    it('should handle multiple filters with sorting and pagination', async () => {
      const mockResult = {
        contracts: [],
        total: 0,
        page: 3,
        limit: 10,
        totalPages: 0,
      };

      mockContractService.getAllContracts = jest.fn().mockResolvedValue(mockResult);

      req.query = {
        status: ContractStatus.IN_PROGRESS,
        projectManagerId: '3',
        sortBy: 'orderDate',
        sortOrder: 'ASC',
        page: '3',
        limit: '10',
      };

      await contractController.getContracts(req as Request, res as Response);

      expect(mockContractService.getAllContracts).toHaveBeenCalledWith(
        {
          status: ContractStatus.IN_PROGRESS,
          projectManagerId: 3,
        },
        {
          sortBy: 'orderDate',
          sortOrder: 'ASC',
          page: 3,
          limit: 10,
        }
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockContractService.getAllContracts = jest.fn().mockRejectedValue(error);

      req.query = {};

      await contractController.getContracts(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd podczas pobierania kontraktów',
        error: 'Database error',
      });
    });
  });
});

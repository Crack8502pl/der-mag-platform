// tests/unit/controllers/ContractController.test.ts
import { Request, Response } from 'express';
import { ContractController } from '../../../src/controllers/ContractController';
import { ContractService } from '../../../src/services/ContractService';
import { SubsystemService } from '../../../src/services/SubsystemService';
import { ContractStatus } from '../../../src/entities/Contract';
import { AppDataSource } from '../../../src/config/database';
import { SubsystemTaskService } from '../../../src/services/SubsystemTaskService';
import { NetworkAllocationService } from '../../../src/services/NetworkAllocationService';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';

// Mock the ContractService and SubsystemService
jest.mock('../../../src/services/ContractService');
jest.mock('../../../src/services/SubsystemService');
jest.mock('../../../src/services/SubsystemTaskService');
jest.mock('../../../src/services/NetworkAllocationService');
jest.mock('../../../src/config/database', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

describe('ContractController', () => {
  let contractController: ContractController;
  let mockContractService: jest.Mocked<ContractService>;
  let mockSubsystemService: jest.Mocked<SubsystemService>;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create a new controller instance
    contractController = new ContractController();
    
    // Get the mocked services
    mockContractService = contractController['contractService'] as jest.Mocked<ContractService>;
    mockSubsystemService = contractController['subsystemService'] as jest.Mocked<SubsystemService>;

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
            contractNumber: 'R0000001_A',
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

  describe('createContractWithWizard', () => {
    it('should create contract with wizard successfully without subsystem', async () => {
      const mockContract = {
        id: 1,
        contractNumber: 'R0000001_A',
        customName: 'Modernizacja SMOK-A Warszawa',
        status: ContractStatus.CREATED,
        orderDate: new Date('2026-01-06'),
        managerCode: 'ABC',
        projectManagerId: 1,
      };

      mockContractService.createContract = jest.fn().mockResolvedValue(mockContract);

      req.body = {
        customName: 'Modernizacja SMOK-A Warszawa',
        orderDate: '2026-01-06',
        projectManagerId: 1,
        managerCode: 'ABC',
        tasks: [
          { number: 'P000010126', name: 'Przejazd Kat A #1', type: 'PRZEJAZD_KAT_A' },
          { number: 'P000020126', name: 'SKP #1', type: 'SKP' },
        ],
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(mockContractService.createContract).toHaveBeenCalledWith({
        customName: 'Modernizacja SMOK-A Warszawa',
        orderDate: new Date('2026-01-06'),
        managerCode: 'ABC',
        projectManagerId: 1,
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Kontrakt utworzony pomyślnie z 2 zadaniami',
        data: expect.objectContaining({
          id: 1,
          contractNumber: 'R0000001_A',
          tasks: expect.arrayContaining([
            expect.objectContaining({ number: 'P000010126' }),
            expect.objectContaining({ number: 'P000020126' }),
          ]),
        }),
      });
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = {
        customName: 'Test Contract',
        // Missing orderDate, managerCode, projectManagerId
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Brakuje wymaganych pól: customName, orderDate, managerCode, projectManagerId',
      });
    });

    it('should return 400 when managerCode is too long', async () => {
      req.body = {
        customName: 'Test Contract',
        orderDate: '2026-01-06',
        managerCode: 'TOOLONG', // 7 characters, max is 5
        projectManagerId: 1,
        tasks: [{ number: 'P000010126', name: 'Task 1', type: 'TYPE_A' }],
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Kod kierownika może mieć maksymalnie 5 znaków',
      });
    });

    it('should return 400 when managerCode is empty', async () => {
      req.body = {
        customName: 'Test Contract',
        orderDate: '2026-01-06',
        managerCode: '',
        projectManagerId: 1,
        tasks: [{ number: 'P000010126', name: 'Task 1', type: 'TYPE_A' }],
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Brakuje wymaganych pól: customName, orderDate, managerCode, projectManagerId',
      });
    });

    it('should return 400 when managerCode is whitespace only', async () => {
      req.body = {
        customName: 'Test Contract',
        orderDate: '2026-01-06',
        managerCode: '   ',
        projectManagerId: 1,
        tasks: [{ number: 'P000010126', name: 'Task 1', type: 'TYPE_A' }],
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Kod kierownika nie może być pusty',
      });
    });

    it('should accept managerCode with exactly 5 characters', async () => {
      const mockContract = {
        id: 1,
        contractNumber: 'R0000001_A',
        customName: 'Test Contract',
        status: ContractStatus.CREATED,
        orderDate: new Date('2026-01-06'),
        managerCode: 'ABCDE',
        projectManagerId: 1,
      };

      mockContractService.createContract = jest.fn().mockResolvedValue(mockContract);

      req.body = {
        customName: 'Test Contract',
        orderDate: '2026-01-06',
        managerCode: 'ABCDE', // Exactly 5 characters
        projectManagerId: 1,
        tasks: [{ number: 'P000010126', name: 'Task 1', type: 'TYPE_A' }],
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(mockContractService.createContract).toHaveBeenCalledWith({
        customName: 'Test Contract',
        orderDate: new Date('2026-01-06'),
        managerCode: 'ABCDE',
        projectManagerId: 1,
      });

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when tasks array is empty', async () => {
      req.body = {
        customName: 'Test Contract',
        orderDate: '2026-01-06',
        managerCode: 'ABC',
        projectManagerId: 1,
        tasks: [],
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Kontrakt musi mieć co najmniej jeden podsystem',
      });
    });

    it('should return 400 when tasks is not an array', async () => {
      req.body = {
        customName: 'Test Contract',
        orderDate: '2026-01-06',
        managerCode: 'ABC',
        projectManagerId: 1,
        tasks: 'not-an-array',
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Kontrakt musi mieć co najmniej jeden podsystem',
      });
    });

    it('should return 400 when subsystemType is invalid', async () => {
      const mockContract = {
        id: 1,
        contractNumber: 'R0000001_A',
        customName: 'Test Contract',
        status: ContractStatus.CREATED,
        orderDate: new Date('2026-01-06'),
        managerCode: 'ABC',
        projectManagerId: 1,
      };

      mockContractService.createContract = jest.fn().mockResolvedValue(mockContract);

      req.body = {
        customName: 'Test Contract',
        orderDate: '2026-01-06',
        managerCode: 'ABC',
        projectManagerId: 1,
        subsystemType: 'INVALID_TYPE',
        tasks: [{ number: 'P000010126', name: 'Task 1', type: 'TYPE_A' }],
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Nieprawidłowy typ podsystemu: INVALID_TYPE',
      });
    });

    it('should handle errors during contract creation', async () => {
      const error = new Error('Database error');
      mockContractService.createContract = jest.fn().mockRejectedValue(error);

      req.body = {
        customName: 'Test Contract',
        orderDate: '2026-01-06',
        managerCode: 'ABC',
        projectManagerId: 1,
        tasks: [{ number: 'P000010126', name: 'Task 1', type: 'TYPE_A' }],
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd podczas tworzenia kontraktu',
        error: 'Database error',
      });
    });
  });

  describe('getContract', () => {
    it('should return contract by id (200)', async () => {
      const mockContract = { id: 1, contractNumber: 'R0000001_A', customName: 'Test' };
      mockContractService.getContractById = jest.fn().mockResolvedValue(mockContract);
      req.params = { id: '1' };

      await contractController.getContract(req as Request, res as Response);

      expect(mockContractService.getContractById).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockContract });
    });

    it('should return 404 when contract not found', async () => {
      mockContractService.getContractById = jest.fn().mockResolvedValue(null);
      req.params = { id: '999' };

      await contractController.getContract(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Kontrakt nie znaleziony' });
    });

    it('should return 500 on error', async () => {
      mockContractService.getContractById = jest.fn().mockRejectedValue(new Error('DB error'));
      req.params = { id: '1' };

      await contractController.getContract(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  describe('createContract', () => {
    it('should create contract and return 201', async () => {
      const mockContract = { id: 1, contractNumber: 'R0000001_A', customName: 'Test' };
      mockContractService.createContract = jest.fn().mockResolvedValue(mockContract);

      req.body = {
        customName: 'Test',
        orderDate: '2026-01-06',
        managerCode: 'ABC',
        projectManagerId: 1,
      };

      await contractController.createContract(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: mockContract }));
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { customName: 'Test' };

      await contractController.createContract(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should return 400 when managerCode is too long', async () => {
      req.body = {
        customName: 'Test',
        orderDate: '2026-01-06',
        managerCode: 'TOOLONG',
        projectManagerId: 1,
      };

      await contractController.createContract(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Kod kierownika może mieć maksymalnie 5 znaków' }));
    });

    it('should return 400 on service error', async () => {
      mockContractService.createContract = jest.fn().mockRejectedValue(new Error('Duplicate'));
      req.body = {
        customName: 'Test',
        orderDate: '2026-01-06',
        managerCode: 'ABC',
        projectManagerId: 1,
      };

      await contractController.createContract(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'Duplicate' }));
    });
  });

  describe('updateContract', () => {
    it('should update contract and return 200', async () => {
      const mockContract = { id: 1, contractNumber: 'R0000001_A', customName: 'Updated' };
      mockContractService.updateContract = jest.fn().mockResolvedValue(mockContract);
      req.params = { id: '1' };
      req.body = { customName: 'Updated' };

      await contractController.updateContract(req as Request, res as Response);

      expect(mockContractService.updateContract).toHaveBeenCalledWith(1, { customName: 'Updated' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: mockContract }));
    });

    it('should return 400 on error', async () => {
      mockContractService.updateContract = jest.fn().mockRejectedValue(new Error('Not found'));
      req.params = { id: '99' };
      req.body = {};

      await contractController.updateContract(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  describe('deleteContract', () => {
    it('should delete contract and return 200', async () => {
      mockContractService.deleteContract = jest.fn().mockResolvedValue(undefined);
      req.params = { id: '1' };

      await contractController.deleteContract(req as Request, res as Response);

      expect(mockContractService.deleteContract).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Kontrakt usunięty pomyślnie' });
    });

    it('should return 400 on error', async () => {
      mockContractService.deleteContract = jest.fn().mockRejectedValue(new Error('Has subsystems'));
      req.params = { id: '1' };

      await contractController.deleteContract(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  describe('approveContract', () => {
    it('should approve contract and return 200', async () => {
      const mockContract = { id: 1, status: 'APPROVED' };
      mockContractService.approveContract = jest.fn().mockResolvedValue(mockContract);
      req.params = { id: '1' };
      (req as any).userId = 5;

      await contractController.approveContract(req as Request, res as Response);

      expect(mockContractService.approveContract).toHaveBeenCalledWith(1, 5);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: mockContract }));
    });

    it('should return 400 on error', async () => {
      mockContractService.approveContract = jest.fn().mockRejectedValue(new Error('Already approved'));
      req.params = { id: '1' };

      await contractController.approveContract(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  describe('importContracts', () => {
    it('should import contracts and return results', async () => {
      mockContractService.createContract = jest.fn().mockResolvedValue({ id: 1 });
      req.body = {
        contracts: [
          { customName: 'C1', orderDate: '2026-01-01', managerCode: 'A', projectManagerId: 1 },
          { customName: 'C2', orderDate: '2026-01-02', managerCode: 'B', projectManagerId: 2 },
        ],
      };

      await contractController.importContracts(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { imported: 2, errors: [] },
      });
    });

    it('should return 400 when body is not an array', async () => {
      req.body = { contracts: 'not-array' };

      await contractController.importContracts(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should collect errors for failed imports', async () => {
      mockContractService.createContract = jest.fn()
        .mockResolvedValueOnce({ id: 1 })
        .mockRejectedValueOnce(new Error('Duplicate'));

      req.body = {
        contracts: [
          { customName: 'C1', orderDate: '2026-01-01', managerCode: 'A', projectManagerId: 1 },
          { customName: 'C2', orderDate: '2026-01-02', managerCode: 'B', projectManagerId: 2 },
        ],
      };

      await contractController.importContracts(req as Request, res as Response);

      const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonArg.data.imported).toBe(1);
      expect(jsonArg.data.errors).toHaveLength(1);
      expect(jsonArg.data.errors[0].error).toBe('Duplicate');
    });
  });

  describe('createContractWithWizard - orderEmails validation', () => {
    beforeEach(() => {
      const mockContract = {
        id: 1,
        contractNumber: 'R0000001_A',
        customName: 'Test',
        status: ContractStatus.CREATED,
        orderDate: new Date('2026-01-06'),
        managerCode: 'ABC',
        projectManagerId: 1,
      };
      mockContractService.createContract = jest.fn().mockResolvedValue(mockContract);
    });

    const validBase = {
      customName: 'Test',
      orderDate: '2026-01-06',
      managerCode: 'ABC',
      projectManagerId: 1,
    };

    it('should return 400 when logistics.orderEmails.cameras is invalid', async () => {
      req.body = {
        ...validBase,
        logistics: { orderEmails: { cameras: 'not-an-email' } },
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('cameras'),
      }));
    });

    it('should return 400 when orderEmails.switches contains CR character (header injection)', async () => {
      req.body = {
        ...validBase,
        logistics: { orderEmails: { switches: 'valid@example.com\r\nBCC:attacker@evil.com' } },
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should return 400 when orderEmails.warehouse contains LF character', async () => {
      req.body = {
        ...validBase,
        logistics: { orderEmails: { warehouse: 'a@b.com\nX-Extra: injected' } },
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should accept valid email addresses in all orderEmails fields', async () => {
      req.body = {
        ...validBase,
        logistics: {
          orderEmails: {
            cameras: 'kamery@firma.pl',
            switches: 'siec@firma.pl',
            recorders: 'nvr@firma.pl',
            general: 'zamowienia@firma.pl',
            warehouse: 'magazyn@firma.pl',
            notes: 'Some notes',
          },
        },
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      // Email validation passes; if there is a 400, it must not be about email format
      const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
      if (jsonArg && !jsonArg.success && jsonArg.message) {
        expect(jsonArg.message).not.toMatch(/e-mail/i);
      }
    });

    it('should allow missing orderEmails fields (all optional)', async () => {
      req.body = {
        ...validBase,
        logistics: { deliveryAddress: '123 Main St', contactPhone: '555-1234' },
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      // No email-related 400
      const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
      if (jsonArg && !jsonArg.success && jsonArg.message) {
        expect(jsonArg.message).not.toMatch(/e-mail/i);
      }
    });

    it('should allow empty string for an orderEmails field (treated as unset)', async () => {
      req.body = {
        ...validBase,
        logistics: { orderEmails: { cameras: '' } },
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
      if (jsonArg && !jsonArg.success && jsonArg.message) {
        expect(jsonArg.message).not.toMatch(/e-mail/i);
      }
    });
  });

  describe('createContractWithWizard - KOMPLETACJA_SZAF auto-creation', () => {
    let mockTaskRepository: any;
    let mockTaskTypeRepository: any;
    let mockSubsystemService: jest.Mocked<SubsystemService>;
    let mockTaskService: jest.Mocked<SubsystemTaskService>;

    beforeEach(() => {
      const mockContract = {
        id: 1,
        contractNumber: 'R0000001_A',
        customName: 'Test',
        status: ContractStatus.CREATED,
        orderDate: new Date('2026-01-06'),
        managerCode: 'ABC',
        projectManagerId: 1,
      };
      mockContractService.createContract = jest.fn().mockResolvedValue(mockContract);

      const mockSubsystem = { id: 10, subsystemNumber: 'S001', ipPool: null };
      mockSubsystemService = contractController['subsystemService'] as jest.Mocked<SubsystemService>;
      mockSubsystemService.createSubsystem = jest.fn().mockResolvedValue(mockSubsystem);

      let taskCounter = 0;
      mockTaskService = contractController['taskService'] as jest.Mocked<SubsystemTaskService>;
      mockTaskService.createTask = jest.fn().mockImplementation(async (data: any) => ({
        id: ++taskCounter,
        taskNumber: `Z${String(taskCounter).padStart(4, '0')}0126`,
        taskName: data.taskName,
        taskType: data.taskType,
        subsystemId: data.subsystemId,
        metadata: data.metadata || {},
      }));

      let mainTaskId = 100;
      mockTaskRepository = {
        create: jest.fn().mockImplementation((data: any) => ({ ...data, id: ++mainTaskId })),
        save: jest.fn().mockImplementation(async (entity: any) => entity),
        findOne: jest.fn().mockResolvedValue(null),
      };

      mockTaskTypeRepository = {
        findOne: jest.fn().mockResolvedValue({ id: 1, code: 'SMOKIP_A', name: 'SMOKIP A' }),
      };

      (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
        const name = typeof entity === 'function' ? entity.name : String(entity);
        if (name === 'Task') return mockTaskRepository;
        if (name === 'TaskType') return mockTaskTypeRepository;
        return { findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
      });
    });

    it('should auto-create KOMPLETACJA_SZAF when cabinet type is set for qualifying task', async () => {
      req.body = {
        customName: 'Test',
        orderDate: '2026-01-06',
        managerCode: 'ABC',
        projectManagerId: 1,
        infrastructure: {
          perTask: {
            'SMOKIP_A-0': { cabinetType: 'SZAFA_TERENOWA', generateCabinetCompletion: true },
          },
        },
        subsystems: [
          {
            type: 'SMOKIP_A',
            params: {},
            tasks: [{ number: '001', name: 'SKP #1', type: 'SKP' }],
          },
        ],
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      // createTask should be called twice: once for the main task, once for KOMPLETACJA_SZAF
      expect(mockTaskService.createTask).toHaveBeenCalledTimes(2);
      const cabinetCall = (mockTaskService.createTask as jest.Mock).mock.calls[1][0];
      expect(cabinetCall.taskType).toBe('KOMPLETACJA_SZAF');
      expect(cabinetCall.metadata.cabinetType).toBe('SZAFA_TERENOWA');
      expect(cabinetCall.metadata.autoGenerated).toBe(true);
    });

    it('should auto-create KOMPLETACJA_SZAF for PRZEJAZD_KAT_C (resolved variant) with cabinetType', async () => {
      req.body = {
        customName: 'Test',
        orderDate: '2026-01-06',
        managerCode: 'ABC',
        projectManagerId: 1,
        infrastructure: {
          perTask: {
            'SMOKIP_B-0': { cabinetType: 'SZAFA_TERENOWA', generateCabinetCompletion: true },
          },
        },
        subsystems: [
          {
            type: 'SMOKIP_B',
            params: {},
            tasks: [{ number: '001', name: 'Przejazd C', type: 'PRZEJAZD_KAT_C' }],
          },
        ],
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(mockTaskService.createTask).toHaveBeenCalledTimes(2);
      const cabinetCall = (mockTaskService.createTask as jest.Mock).mock.calls[1][0];
      expect(cabinetCall.taskType).toBe('KOMPLETACJA_SZAF');
    });

    it('should NOT create KOMPLETACJA_SZAF when task type does not qualify', async () => {
      req.body = {
        customName: 'Test',
        orderDate: '2026-01-06',
        managerCode: 'ABC',
        projectManagerId: 1,
        infrastructure: {
          perTask: {
            'SMW-0': { cabinetType: 'SZAFA_TERENOWA', generateCabinetCompletion: true },
          },
        },
        subsystems: [
          {
            type: 'SMW',
            params: {},
            tasks: [{ number: '001', name: 'SMW Task', type: 'SMW' }],
          },
        ],
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      // Only main task created, no cabinet task
      expect(mockTaskService.createTask).toHaveBeenCalledTimes(1);
    });

    it('should auto-create KOMPLETACJA_SZAF when cabinetType set but generateCabinetCompletion absent (backward compat)', async () => {
      req.body = {
        customName: 'Test',
        orderDate: '2026-01-06',
        managerCode: 'ABC',
        projectManagerId: 1,
        infrastructure: {
          perTask: {
            // generateCabinetCompletion deliberately absent (old data format)
            'SMOKIP_A-0': { cabinetType: 'SZAFA_TERENOWA' },
          },
        },
        subsystems: [
          {
            type: 'SMOKIP_A',
            params: {},
            tasks: [{ number: '001', name: 'SKP #1', type: 'SKP' }],
          },
        ],
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(mockTaskService.createTask).toHaveBeenCalledTimes(2);
      const cabinetCall = (mockTaskService.createTask as jest.Mock).mock.calls[1][0];
      expect(cabinetCall.taskType).toBe('KOMPLETACJA_SZAF');
    });

    it('should NOT create KOMPLETACJA_SZAF when generateCabinetCompletion is explicitly false', async () => {
      req.body = {
        customName: 'Test',
        orderDate: '2026-01-06',
        managerCode: 'ABC',
        projectManagerId: 1,
        infrastructure: {
          perTask: {
            'SMOKIP_A-0': { cabinetType: 'SZAFA_TERENOWA', generateCabinetCompletion: false },
          },
        },
        subsystems: [
          {
            type: 'SMOKIP_A',
            params: {},
            tasks: [{ number: '001', name: 'SKP #1', type: 'SKP' }],
          },
        ],
      };

      await contractController.createContractWithWizard(req as Request, res as Response);

      expect(mockTaskService.createTask).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStats', () => {
    it('should return stats (200)', async () => {
      const mockStats = { total: 5, byStatus: { CREATED: 3, APPROVED: 2 } };
      mockContractService.getStats = jest.fn().mockResolvedValue(mockStats);

      await contractController.getStats(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockStats });
    });

    it('should return 500 on error', async () => {
      mockContractService.getStats = jest.fn().mockRejectedValue(new Error('DB error'));

      await contractController.getStats(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });
});

// tests/unit/controllers/RoleController.test.ts
import { Request, Response } from 'express';
import { RoleController } from '../../../src/controllers/RoleController';
import { AppDataSource } from '../../../src/config/database';
import { Role } from '../../../src/entities/Role';
import { createMockRequest, createMockResponse } from '../../mocks/request.mock';
import { createMockRepository } from '../../mocks/database.mock';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('RoleController', () => {
  let mockRoleRepository: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockRoleRepository = createMockRepository<Role>();

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRoleRepository);

    req = createMockRequest();
    res = createMockResponse();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/roles', () => {
    it('should return 200 and list of all roles', async () => {
      const mockRoles = [
        {
          id: 1,
          name: 'admin',
          description: 'Administrator Systemu',
          permissions: { all: true }
        },
        {
          id: 2,
          name: 'manager',
          description: 'Menedżer',
          permissions: { contracts: { read: true, create: true } }
        }
      ] as Role[];

      mockRoleRepository.find.mockResolvedValue(mockRoles);

      await RoleController.getAll(req as Request, res as Response);

      expect(mockRoleRepository.find).toHaveBeenCalledWith({
        order: { id: 'ASC' }
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            id: 1,
            name: 'admin',
            description: 'Administrator Systemu',
            permissions: { all: true }
          },
          {
            id: 2,
            name: 'manager',
            description: 'Menedżer',
            permissions: { contracts: { read: true, create: true } }
          }
        ]
      });
    });

    it('should return 500 on database error', async () => {
      const mockError = new Error('Database connection failed');
      mockRoleRepository.find.mockRejectedValue(mockError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await RoleController.getAll(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd pobierania ról'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Błąd pobierania ról:', mockError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/admin/roles/:id', () => {
    it('should return 200 and role details for valid id', async () => {
      const mockRole = {
        id: 1,
        name: 'admin',
        description: 'Administrator Systemu',
        permissions: { all: true }
      } as Role;

      req.params = { id: '1' };
      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      await RoleController.getById(req as Request, res as Response);

      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 }
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRole
      });
    });

    it('should return 404 when role not found', async () => {
      req.params = { id: '999' };
      mockRoleRepository.findOne.mockResolvedValue(null);

      await RoleController.getById(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Rola nie została znaleziona'
      });
    });

    it('should return 500 on database error', async () => {
      const mockError = new Error('Database query failed');
      req.params = { id: '1' };
      mockRoleRepository.findOne.mockRejectedValue(mockError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await RoleController.getById(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Błąd pobierania roli'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Błąd pobierania roli:', mockError);

      consoleErrorSpy.mockRestore();
    });
  });
});

// tests/unit/controllers/RoleController.test.ts
import { Request, Response } from 'express';
import { RoleController } from '../../../src/controllers/RoleController';
import { AppDataSource } from '../../../src/config/database';
import { Role } from '../../../src/entities/Role';
import { User } from '../../../src/entities/User';
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
  let mockUserRepository: any;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockRoleRepository = createMockRepository<Role>();
    mockUserRepository = createMockRepository<User>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Role) return mockRoleRepository;
      if (entity === User) return mockUserRepository;
      return createMockRepository();
    });

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
        data: mockRoles
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

  describe('PUT /api/admin/roles/:id', () => {
    it('should update role permissions successfully', async () => {
      const mockRole = {
        id: 2,
        name: 'manager',
        description: 'Manager',
        permissions: { contracts: { read: true } }
      } as Role;

      req.params = { id: '2' };
      req.body = {
        permissions: { contracts: { read: true, create: true } }
      };

      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockRoleRepository.save.mockResolvedValue({
        ...mockRole,
        permissions: { contracts: { read: true, create: true } }
      });

      await RoleController.update(req as Request, res as Response);

      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2 }
      });
      expect(mockRoleRepository.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 2,
          name: 'manager'
        })
      });
    });

    it('should prevent changing admin role name', async () => {
      const mockRole = {
        id: 1,
        name: 'admin',
        description: 'Admin',
        permissions: { all: true }
      } as Role;

      req.params = { id: '1' };
      req.body = { name: 'superadmin' };

      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      await RoleController.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Nie można zmienić nazwy roli admin'
      });
    });

    it('should prevent removing all: true from admin role', async () => {
      const mockRole = {
        id: 1,
        name: 'admin',
        description: 'Admin',
        permissions: { all: true }
      } as Role;

      req.params = { id: '1' };
      req.body = { permissions: { contracts: { read: true } } };

      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      await RoleController.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Rola admin musi mieć uprawnienie all: true'
      });
    });

    it('should return 404 when role not found', async () => {
      req.params = { id: '999' };
      req.body = { permissions: {} };
      mockRoleRepository.findOne.mockResolvedValue(null);

      await RoleController.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Rola nie została znaleziona'
      });
    });
  });

  describe('POST /api/admin/roles', () => {
    it('should create new role successfully', async () => {
      const newRoleData = {
        name: 'viewer',
        description: 'Read-only access',
        permissions: { dashboard: { read: true } }
      };

      req.body = newRoleData;

      mockRoleRepository.findOne.mockResolvedValue(null);
      mockRoleRepository.create.mockReturnValue({ id: 11, ...newRoleData });
      mockRoleRepository.save.mockResolvedValue({ id: 11, ...newRoleData });

      await RoleController.create(req as Request, res as Response);

      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'viewer' }
      });
      expect(mockRoleRepository.create).toHaveBeenCalledWith({
        name: 'viewer',
        description: 'Read-only access',
        permissions: { dashboard: { read: true } }
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 11,
          name: 'viewer'
        })
      });
    });

    it('should return 400 when name is missing', async () => {
      req.body = { description: 'Test' };

      await RoleController.create(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Nazwa roli jest wymagana'
      });
    });

    it('should return 400 when role name already exists', async () => {
      req.body = { name: 'manager', description: 'Test' };
      
      mockRoleRepository.findOne.mockResolvedValue({
        id: 2,
        name: 'manager'
      });

      await RoleController.create(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Rola o tej nazwie już istnieje'
      });
    });
  });

  describe('DELETE /api/admin/roles/:id', () => {
    it('should delete role when no users assigned', async () => {
      const mockRole = {
        id: 3,
        name: 'test_role',
        description: 'Test',
        permissions: {}
      } as Role;

      req.params = { id: '3' };

      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockUserRepository.count.mockResolvedValue(0);
      mockRoleRepository.remove.mockResolvedValue(mockRole);

      await RoleController.delete(req as Request, res as Response);

      expect(mockUserRepository.count).toHaveBeenCalledWith({
        where: { role: { id: 3 } }
      });
      expect(mockRoleRepository.remove).toHaveBeenCalledWith(mockRole);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Rola została usunięta'
      });
    });

    it('should prevent deleting admin role', async () => {
      const mockRole = {
        id: 1,
        name: 'admin',
        description: 'Admin',
        permissions: { all: true }
      } as Role;

      req.params = { id: '1' };
      mockRoleRepository.findOne.mockResolvedValue(mockRole);

      await RoleController.delete(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Nie można usunąć roli admin'
      });
    });

    it('should prevent deleting role with assigned users', async () => {
      const mockRole = {
        id: 2,
        name: 'manager',
        description: 'Manager',
        permissions: {}
      } as Role;

      req.params = { id: '2' };

      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockUserRepository.count.mockResolvedValue(3);

      await RoleController.delete(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Nie można usunąć roli - jest przypisana do 3 użytkowników'
      });
    });

    it('should return 404 when role not found', async () => {
      req.params = { id: '999' };
      mockRoleRepository.findOne.mockResolvedValue(null);

      await RoleController.delete(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Rola nie została znaleziona'
      });
    });
  });

  describe('GET /api/admin/roles/permissions-schema', () => {
    it('should return permissions schema', async () => {
      await RoleController.getPermissionsSchema(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            name: 'dashboard',
            displayName: 'Dashboard',
            actions: expect.any(Array)
          }),
          expect.objectContaining({
            name: 'contracts',
            displayName: 'Kontrakty',
            actions: expect.arrayContaining(['read', 'create', 'update', 'delete', 'approve', 'import'])
          }),
          expect.objectContaining({
            name: 'users',
            displayName: 'Użytkownicy',
            actions: expect.arrayContaining(['read', 'create', 'update', 'delete'])
          })
        ])
      });
    });
  });
});

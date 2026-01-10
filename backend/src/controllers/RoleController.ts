// src/controllers/RoleController.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Role, RolePermissions } from '../entities/Role';
import { User } from '../entities/User';

export class RoleController {
  /**
   * GET /api/admin/roles
   * Pobiera wszystkie role
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const roleRepo = AppDataSource.getRepository(Role);
      const roles = await roleRepo.find({
        order: { id: 'ASC' }
      });

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('Błąd pobierania ról:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania ról'
      });
    }
  }

  /**
   * GET /api/admin/roles/:id
   * Pobiera szczegóły roli
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roleRepo = AppDataSource.getRepository(Role);
      
      const role = await roleRepo.findOne({
        where: { id: parseInt(id) }
      });

      if (!role) {
        res.status(404).json({
          success: false,
          message: 'Rola nie została znaleziona'
        });
        return;
      }

      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      console.error('Błąd pobierania roli:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania roli'
      });
    }
  }

  /**
   * PUT /api/admin/roles/:id
   * Aktualizuje uprawnienia roli
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, permissions } = req.body;
      const roleRepo = AppDataSource.getRepository(Role);
      
      const role = await roleRepo.findOne({
        where: { id: parseInt(id) }
      });

      if (!role) {
        res.status(404).json({
          success: false,
          message: 'Rola nie została znaleziona'
        });
        return;
      }

      // Walidacja: nie można zmienić nazwy roli admin
      if (role.name === 'admin' && name && name !== 'admin') {
        res.status(400).json({
          success: false,
          message: 'Nie można zmienić nazwy roli admin'
        });
        return;
      }

      // Walidacja: admin zawsze musi mieć all: true
      if (role.name === 'admin' && permissions && !permissions.all) {
        res.status(400).json({
          success: false,
          message: 'Rola admin musi mieć uprawnienie all: true'
        });
        return;
      }

      // Aktualizuj pola
      if (name !== undefined) role.name = name;
      if (description !== undefined) role.description = description;
      if (permissions !== undefined) role.permissions = permissions;

      await roleRepo.save(role);

      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      console.error('Błąd aktualizacji roli:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd aktualizacji roli'
      });
    }
  }

  /**
   * POST /api/admin/roles
   * Tworzy nową rolę
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, permissions } = req.body;
      const roleRepo = AppDataSource.getRepository(Role);

      // Walidacja: nazwa jest wymagana
      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Nazwa roli jest wymagana'
        });
        return;
      }

      // Sprawdź czy rola o takiej nazwie już istnieje
      const existingRole = await roleRepo.findOne({
        where: { name }
      });

      if (existingRole) {
        res.status(400).json({
          success: false,
          message: 'Rola o tej nazwie już istnieje'
        });
        return;
      }

      // Utwórz nową rolę
      const newRole = roleRepo.create({
        name,
        description: description || '',
        permissions: permissions || {}
      });

      await roleRepo.save(newRole);

      res.status(201).json({
        success: true,
        data: newRole
      });
    } catch (error) {
      console.error('Błąd tworzenia roli:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd tworzenia roli'
      });
    }
  }

  /**
   * DELETE /api/admin/roles/:id
   * Usuwa rolę (sprawdza czy nie ma przypisanych użytkowników)
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roleRepo = AppDataSource.getRepository(Role);
      const userRepo = AppDataSource.getRepository(User);
      
      const role = await roleRepo.findOne({
        where: { id: parseInt(id) }
      });

      if (!role) {
        res.status(404).json({
          success: false,
          message: 'Rola nie została znaleziona'
        });
        return;
      }

      // Walidacja: nie można usunąć roli admin
      if (role.name === 'admin') {
        res.status(400).json({
          success: false,
          message: 'Nie można usunąć roli admin'
        });
        return;
      }

      // Sprawdź czy są przypisani użytkownicy
      const usersCount = await userRepo.count({
        where: { role: { id: role.id } }
      });

      if (usersCount > 0) {
        res.status(400).json({
          success: false,
          message: `Nie można usunąć roli - jest przypisana do ${usersCount} użytkowników`
        });
        return;
      }

      await roleRepo.remove(role);

      res.json({
        success: true,
        message: 'Rola została usunięta'
      });
    } catch (error) {
      console.error('Błąd usuwania roli:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd usuwania roli'
      });
    }
  }

  /**
   * GET /api/admin/roles/permissions-schema
   * Zwraca strukturę wszystkich dostępnych uprawnień (wszystkie moduły i akcje)
   */
  static async getPermissionsSchema(req: Request, res: Response): Promise<void> {
    try {
      // Definiujemy strukturę uprawnień na podstawie interfejsów w Role.ts
      const schema = [
        {
          name: 'dashboard',
          displayName: 'Dashboard',
          actions: ['read']
        },
        {
          name: 'contracts',
          displayName: 'Kontrakty',
          actions: ['read', 'create', 'update', 'delete', 'approve', 'import']
        },
        {
          name: 'subsystems',
          displayName: 'Podsystemy',
          actions: ['read', 'create', 'update', 'delete', 'generateBom', 'allocateNetwork']
        },
        {
          name: 'tasks',
          displayName: 'Zadania',
          actions: ['read', 'create', 'update', 'delete', 'assign']
        },
        {
          name: 'completion',
          displayName: 'Kompletacja',
          actions: ['read', 'scan', 'assignPallet', 'reportMissing', 'decideContinue', 'complete']
        },
        {
          name: 'prefabrication',
          displayName: 'Prefabrykacja',
          actions: ['read', 'receiveOrder', 'configure', 'verify', 'assignSerial', 'complete']
        },
        {
          name: 'network',
          displayName: 'Sieć',
          actions: ['read', 'createPool', 'updatePool', 'deletePool', 'allocate', 'viewMatrix']
        },
        {
          name: 'bom',
          displayName: 'BOM',
          actions: ['read', 'create', 'update', 'delete']
        },
        {
          name: 'devices',
          displayName: 'Urządzenia',
          actions: ['read', 'create', 'update', 'verify']
        },
        {
          name: 'users',
          displayName: 'Użytkownicy',
          actions: ['read', 'create', 'update', 'delete']
        },
        {
          name: 'reports',
          displayName: 'Raporty',
          actions: ['read', 'create', 'export']
        },
        {
          name: 'settings',
          displayName: 'Ustawienia',
          actions: ['read', 'update']
        },
        {
          name: 'photos',
          displayName: 'Zdjęcia',
          actions: ['read', 'create', 'approve']
        },
        {
          name: 'documents',
          displayName: 'Dokumenty',
          actions: ['read', 'create', 'delete']
        },
        {
          name: 'notifications',
          displayName: 'Powiadomienia',
          actions: ['receiveAlerts', 'sendManual', 'configureTriggers']
        },
        {
          name: 'warehouse_stock',
          displayName: 'Magazyn',
          actions: ['read', 'create', 'update', 'delete', 'manage_locations', 'adjust_stock', 'view_history', 'view_prices', 'export', 'import', 'reserve_stock', 'release_stock', 'auto_assign', 'scan_material']
        },
        {
          name: 'brigades',
          displayName: 'Brygady',
          actions: ['read', 'create', 'update', 'delete', 'assignMembers', 'viewMembers']
        }
      ];

      res.json({
        success: true,
        data: schema
      });
    } catch (error) {
      console.error('Błąd pobierania schematu uprawnień:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania schematu uprawnień'
      });
    }
  }
}

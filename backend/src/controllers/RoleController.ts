// src/controllers/RoleController.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Role } from '../entities/Role';

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
        data: roles.map((role: Role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: role.permissions
        }))
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
}

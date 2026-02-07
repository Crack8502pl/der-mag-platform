// src/controllers/BomGroupController.ts
// Controller for BOM material groups

import { Request, Response } from 'express';
import { BomGroupService } from '../services/BomGroupService';

export class BomGroupController {
  /**
   * Get all groups
   * GET /api/bom-groups
   */
  static async getAllGroups(req: Request, res: Response): Promise<void> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const groups = await BomGroupService.getAll(includeInactive);

      res.json({
        success: true,
        data: groups
      });
    } catch (error: any) {
      console.error('Error fetching BOM groups:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania grup',
        error: error.message
      });
    }
  }

  /**
   * Get a specific group by ID
   * GET /api/bom-groups/:id
   */
  static async getGroupById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const group = await BomGroupService.getById(Number(id));

      if (!group) {
        res.status(404).json({
          success: false,
          message: 'Grupa nie znaleziona'
        });
        return;
      }

      res.json({
        success: true,
        data: group
      });
    } catch (error: any) {
      console.error('Error fetching BOM group:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania grupy',
        error: error.message
      });
    }
  }

  /**
   * Create a new group
   * POST /api/bom-groups
   */
  static async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const group = await BomGroupService.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Grupa utworzona pomyślnie',
        data: group
      });
    } catch (error: any) {
      console.error('Error creating BOM group:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd tworzenia grupy',
        error: error.message
      });
    }
  }

  /**
   * Update an existing group
   * PUT /api/bom-groups/:id
   */
  static async updateGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const group = await BomGroupService.update(Number(id), req.body);

      res.json({
        success: true,
        message: 'Grupa zaktualizowana pomyślnie',
        data: group
      });
    } catch (error: any) {
      console.error('Error updating BOM group:', error);
      
      if (error.message === 'Group not found') {
        res.status(404).json({
          success: false,
          message: 'Grupa nie znaleziona'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Błąd aktualizacji grupy',
        error: error.message
      });
    }
  }

  /**
   * Delete a group (soft delete)
   * DELETE /api/bom-groups/:id
   */
  static async deleteGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await BomGroupService.delete(Number(id));

      res.json({
        success: true,
        message: 'Grupa usunięta pomyślnie'
      });
    } catch (error: any) {
      console.error('Error deleting BOM group:', error);
      
      if (error.message === 'Group not found') {
        res.status(404).json({
          success: false,
          message: 'Grupa nie znaleziona'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Błąd usuwania grupy',
        error: error.message
      });
    }
  }
}

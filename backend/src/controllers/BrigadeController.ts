// src/controllers/BrigadeController.ts
// Controller for brigades endpoints

import { Request, Response } from 'express';
import { BrigadeService } from '../services/BrigadeService';

export class BrigadeController {
  private brigadeService = new BrigadeService();

  /**
   * POST /api/brigades
   * Create a new brigade
   */
  createBrigade = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, name, description, active } = req.body;

      if (!code || !name) {
        res.status(400).json({
          success: false,
          message: 'Kod i nazwa są wymagane',
        });
        return;
      }

      const brigade = await this.brigadeService.createBrigade({
        code,
        name,
        description,
        active,
      });

      res.status(201).json({
        success: true,
        message: 'Brygada utworzona pomyślnie',
        data: brigade,
      });
    } catch (error: any) {
      console.error('Error creating brigade:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Błąd podczas tworzenia brygady',
      });
    }
  };

  /**
   * GET /api/brigades
   * Get all brigades
   */
  getBrigades = async (req: Request, res: Response): Promise<void> => {
    try {
      const { active, page = 1, limit = 20 } = req.query;

      const { brigades, total } = await this.brigadeService.getBrigades({
        active: active !== undefined ? active === 'true' : undefined,
        page: Number(page),
        limit: Number(limit),
      });

      res.json({
        success: true,
        data: brigades,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error('Error getting brigades:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania brygad',
      });
    }
  };

  /**
   * GET /api/brigades/:id
   * Get brigade by ID
   */
  getBrigade = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const brigade = await this.brigadeService.getBrigadeById(Number(id));

      if (!brigade) {
        res.status(404).json({
          success: false,
          message: 'Brygada nie znaleziona',
        });
        return;
      }

      res.json({
        success: true,
        data: brigade,
      });
    } catch (error: any) {
      console.error('Error getting brigade:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania brygady',
      });
    }
  };

  /**
   * PUT /api/brigades/:id
   * Update brigade
   */
  updateBrigade = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data = req.body;

      const brigade = await this.brigadeService.updateBrigade(Number(id), data);

      res.json({
        success: true,
        message: 'Brygada zaktualizowana pomyślnie',
        data: brigade,
      });
    } catch (error: any) {
      console.error('Error updating brigade:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Błąd podczas aktualizacji brygady',
      });
    }
  };

  /**
   * DELETE /api/brigades/:id
   * Delete brigade
   */
  deleteBrigade = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.brigadeService.deleteBrigade(Number(id));

      res.json({
        success: true,
        message: 'Brygada usunięta pomyślnie',
      });
    } catch (error: any) {
      console.error('Error deleting brigade:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Błąd podczas usuwania brygady',
      });
    }
  };

  /**
   * POST /api/brigades/:id/members
   * Add member to brigade
   */
  addMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { userId, workDays, validFrom, validTo, active } = req.body;

      if (!userId || !workDays || !validFrom) {
        res.status(400).json({
          success: false,
          message: 'ID użytkownika, dni pracy i data rozpoczęcia są wymagane',
        });
        return;
      }

      const member = await this.brigadeService.addMember({
        brigadeId: Number(id),
        userId: Number(userId),
        workDays,
        validFrom: new Date(validFrom),
        validTo: validTo ? new Date(validTo) : undefined,
        active,
      });

      res.status(201).json({
        success: true,
        message: 'Członek dodany do brygady',
        data: member,
      });
    } catch (error: any) {
      console.error('Error adding brigade member:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Błąd podczas dodawania członka',
      });
    }
  };

  /**
   * GET /api/brigades/:id/members
   * Get brigade members
   */
  getMembers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { active } = req.query;

      const members = await this.brigadeService.getBrigadeMembers(
        Number(id),
        { active: active !== undefined ? active === 'true' : undefined }
      );

      res.json({
        success: true,
        data: members,
      });
    } catch (error: any) {
      console.error('Error getting brigade members:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania członków brygady',
      });
    }
  };

  /**
   * PUT /api/brigades/:brigadeId/members/:memberId
   * Update brigade member
   */
  updateMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const { memberId } = req.params;
      const data = req.body;

      // Convert dates if provided
      if (data.validFrom) {
        data.validFrom = new Date(data.validFrom);
      }
      if (data.validTo) {
        data.validTo = new Date(data.validTo);
      }

      const member = await this.brigadeService.updateMember(Number(memberId), data);

      res.json({
        success: true,
        message: 'Członek zaktualizowany pomyślnie',
        data: member,
      });
    } catch (error: any) {
      console.error('Error updating brigade member:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Błąd podczas aktualizacji członka',
      });
    }
  };

  /**
   * DELETE /api/brigades/:brigadeId/members/:memberId
   * Remove member from brigade
   */
  removeMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const { memberId } = req.params;
      await this.brigadeService.removeMember(Number(memberId));

      res.json({
        success: true,
        message: 'Członek usunięty z brygady',
      });
    } catch (error: any) {
      console.error('Error removing brigade member:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Błąd podczas usuwania członka',
      });
    }
  };

  /**
   * GET /api/brigades/:id/stats
   * Get brigade statistics
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const stats = await this.brigadeService.getBrigadeStatistics(Number(id));

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error getting brigade statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Błąd podczas pobierania statystyk',
      });
    }
  };
}

export default new BrigadeController();

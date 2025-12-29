// src/controllers/SubsystemController.ts
// Kontroler dla endpointów podsystemów

import { Request, Response } from 'express';
import { SubsystemService } from '../services/SubsystemService';
import { SystemType, SubsystemStatus } from '../entities/Subsystem';

export class SubsystemController {
  private subsystemService: SubsystemService;

  constructor() {
    this.subsystemService = new SubsystemService();
  }

  /**
   * GET /api/contracts/:contractId/subsystems
   * Lista podsystemów dla kontraktu
   */
  getContractSubsystems = async (req: Request, res: Response): Promise<void> => {
    try {
      const { contractId } = req.params;
      const subsystems = await this.subsystemService.getSubsystemsByContract(
        parseInt(contractId)
      );

      res.json({
        success: true,
        data: subsystems,
        count: subsystems.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania podsystemów',
        error: error.message
      });
    }
  };

  /**
   * POST /api/contracts/:contractId/subsystems
   * Utworzenie nowego podsystemu
   */
  createSubsystem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { contractId } = req.params;
      const { systemType, quantity, subsystemNumber } = req.body;

      if (!systemType) {
        res.status(400).json({
          success: false,
          message: 'Brakuje wymaganego pola: systemType'
        });
        return;
      }

      const subsystem = await this.subsystemService.createSubsystem({
        contractId: parseInt(contractId),
        systemType: systemType as SystemType,
        quantity,
        subsystemNumber
      });

      res.status(201).json({
        success: true,
        message: 'Podsystem utworzony pomyślnie',
        data: subsystem
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas tworzenia podsystemu',
        error: error.message
      });
    }
  };

  /**
   * GET /api/subsystems/:id
   * Szczegóły podsystemu
   */
  getSubsystem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const subsystem = await this.subsystemService.getSubsystemById(parseInt(id));

      if (!subsystem) {
        res.status(404).json({
          success: false,
          message: 'Podsystem nie znaleziony'
        });
        return;
      }

      res.json({
        success: true,
        data: subsystem
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania podsystemu',
        error: error.message
      });
    }
  };

  /**
   * PUT /api/subsystems/:id
   * Aktualizacja podsystemu
   */
  updateSubsystem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const subsystem = await this.subsystemService.updateSubsystem(
        parseInt(id),
        updates
      );

      res.json({
        success: true,
        message: 'Podsystem zaktualizowany pomyślnie',
        data: subsystem
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas aktualizacji podsystemu',
        error: error.message
      });
    }
  };

  /**
   * DELETE /api/subsystems/:id
   * Usunięcie podsystemu
   */
  deleteSubsystem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.subsystemService.deleteSubsystem(parseInt(id));

      res.json({
        success: true,
        message: 'Podsystem usunięty pomyślnie'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas usuwania podsystemu',
        error: error.message
      });
    }
  };
}

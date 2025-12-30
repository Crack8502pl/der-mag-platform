// src/controllers/BomTriggerController.ts
// Kontroler zarządzania triggerami BOM

import { Request, Response } from 'express';
import { BomTriggerService } from '../services/BomTriggerService';

export class BomTriggerController {
  /**
   * GET /api/bom-triggers
   * Lista wszystkich triggerów
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { isActive, triggerEvent } = req.query;
      
      const filters: any = {};
      
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      
      if (triggerEvent) {
        filters.triggerEvent = triggerEvent;
      }

      const triggers = await BomTriggerService.getAllTriggers(filters);
      
      res.json({
        success: true,
        data: triggers
      });
    } catch (error) {
      console.error('Błąd pobierania triggerów:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * GET /api/bom-triggers/:id
   * Szczegóły triggera
   */
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const trigger = await BomTriggerService.getTriggerById(Number(id));
      
      if (!trigger) {
        res.status(404).json({
          success: false,
          message: 'Trigger nie znaleziony'
        });
        return;
      }

      res.json({
        success: true,
        data: trigger
      });
    } catch (error) {
      console.error('Błąd pobierania triggera:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * POST /api/bom-triggers
   * Tworzenie triggera
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const trigger = await BomTriggerService.createTrigger(req.body, req.userId);
      
      res.status(201).json({
        success: true,
        data: trigger,
        message: 'Trigger utworzony pomyślnie'
      });
    } catch (error) {
      console.error('Błąd tworzenia triggera:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * PUT /api/bom-triggers/:id
   * Aktualizacja triggera
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const trigger = await BomTriggerService.updateTrigger(Number(id), req.body);
      
      res.json({
        success: true,
        data: trigger,
        message: 'Trigger zaktualizowany pomyślnie'
      });
    } catch (error: any) {
      console.error('Błąd aktualizacji triggera:', error);
      
      if (error.message === 'Trigger nie znaleziony') {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * DELETE /api/bom-triggers/:id
   * Usuwanie triggera (soft delete)
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await BomTriggerService.deleteTrigger(Number(id));
      
      res.json({
        success: true,
        message: 'Trigger usunięty pomyślnie'
      });
    } catch (error: any) {
      console.error('Błąd usuwania triggera:', error);
      
      if (error.message === 'Trigger nie znaleziony') {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * POST /api/bom-triggers/:id/toggle
   * Włączanie/wyłączanie triggera
   */
  static async toggle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const trigger = await BomTriggerService.toggleTrigger(Number(id));
      
      res.json({
        success: true,
        data: trigger,
        message: `Trigger ${trigger.isActive ? 'aktywowany' : 'dezaktywowany'} pomyślnie`
      });
    } catch (error: any) {
      console.error('Błąd przełączania triggera:', error);
      
      if (error.message === 'Trigger nie znaleziony') {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * POST /api/bom-triggers/:id/test
   * Testowe wykonanie triggera
   */
  static async test(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { testData } = req.body;
      
      const trigger = await BomTriggerService.getTriggerById(Number(id));
      
      if (!trigger) {
        res.status(404).json({
          success: false,
          message: 'Trigger nie znaleziony'
        });
        return;
      }

      const result = await BomTriggerService.executeTrigger(trigger, testData ?? {});
      
      res.json({
        success: true,
        data: result,
        message: 'Test triggera wykonany pomyślnie'
      });
    } catch (error: any) {
      console.error('Błąd testowania triggera:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Błąd serwera'
      });
    }
  }

  /**
   * GET /api/bom-triggers/events
   * Lista dostępnych eventów
   */
  static async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const events = BomTriggerService.getAvailableEvents();
      
      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error('Błąd pobierania eventów:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * GET /api/bom-triggers/actions
   * Lista dostępnych akcji
   */
  static async getActions(req: Request, res: Response): Promise<void> {
    try {
      const actions = BomTriggerService.getAvailableActions();
      
      res.json({
        success: true,
        data: actions
      });
    } catch (error) {
      console.error('Błąd pobierania akcji:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }

  /**
   * GET /api/bom-triggers/:id/logs
   * Pobiera logi wykonania triggera
   */
  static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit } = req.query;
      
      const logs = await BomTriggerService.getTriggerLogs(
        Number(id),
        limit ? Number(limit) : 50
      );
      
      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      console.error('Błąd pobierania logów:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera'
      });
    }
  }
}

// src/controllers/CarController.ts
// Kontroler dla endpointów samochodów

import { Request, Response } from 'express';
import { SymfoniaCarSyncService } from '../services/SymfoniaCarSyncService';

export class CarController {
  /**
   * GET /api/cars
   * Lista aktywnych samochodów
   */
  static async getCars(req: Request, res: Response): Promise<void> {
    try {
      const cars = await SymfoniaCarSyncService.getActiveCars();
      res.json({ success: true, data: cars });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * POST /api/cars/:id/toggle-brigade
   * Przełącz tworzenie brygady dla samochodu
   */
  static async toggleBrigade(req: Request, res: Response): Promise<void> {
    try {
      const carId = parseInt(req.params.id, 10);
      if (isNaN(carId)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowe ID samochodu' });
        return;
      }
      const { createBrigade } = req.body;

      const car = await SymfoniaCarSyncService.toggleBrigade(carId, Boolean(createBrigade));
      res.json({ success: true, data: car });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg === 'Samochód nie znaleziony') {
        res.status(404).json({ success: false, message: msg });
      } else {
        res.status(500).json({ success: false, message: msg });
      }
    }
  }

  /**
   * POST /api/admin/cars/sync
   * Ręczna synchronizacja samochodów (tylko admin)
   */
  static async syncCars(req: Request, res: Response): Promise<void> {
    try {
      const result = await SymfoniaCarSyncService.syncCars();
      res.json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }
}

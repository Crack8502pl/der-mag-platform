// backend/src/controllers/RailwayController.ts

import { Request, Response } from 'express';
import { railwayService } from '../services/RailwayService';

export class RailwayController {
  /** GET /api/railway/lines?q= — lista linii (do dropdown) */
  static async searchLines(req: Request, res: Response): Promise<void> {
    try {
      const q = req.query.q as string | undefined;
      const lines = await railwayService.searchLines(q);
      res.json({ success: true, data: lines });
    } catch (error: any) {
      console.error('RailwayController.searchLines error:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /** GET /api/railway/lines/:code — szczegóły linii */
  static async getLineByCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const line = await railwayService.getLineByCode(code);
      if (!line) {
        res.status(404).json({ success: false, message: `Linia ${code} nie znaleziona` });
        return;
      }
      res.json({ success: true, data: line });
    } catch (error: any) {
      console.error('RailwayController.getLineByCode error:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /** GET /api/railway/stations?q=&line=&limit= — autocomplete stacji */
  static async searchStations(req: Request, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const line = req.query.line as string | undefined;
      const limit = Math.min(parseInt((req.query.limit as string) || '10', 10), 50);
      const stations = await railwayService.searchStations(q, line, limit);
      res.json({ success: true, data: stations });
    } catch (error: any) {
      console.error('RailwayController.searchStations error:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /** GET /api/railway/stations/line/:lineCode — wszystkie stacje linii */
  static async getStationsForLine(req: Request, res: Response): Promise<void> {
    try {
      const { lineCode } = req.params;
      const stations = await railwayService.getStationsForLine(lineCode);
      res.json({ success: true, data: stations });
    } catch (error: any) {
      console.error('RailwayController.getStationsForLine error:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /** POST /api/railway/validate-km — walidacja kilometrażu { km, lineCode } */
  static async validateKilometraz(req: Request, res: Response): Promise<void> {
    try {
      const { km, lineCode } = req.body as { km: number; lineCode: string };
      if (km === undefined || !lineCode) {
        res.status(400).json({ success: false, message: 'Brak wymaganych pól: km, lineCode' });
        return;
      }
      const result = await railwayService.validateKilometraz(Number(km), lineCode);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('RailwayController.validateKilometraz error:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }
}

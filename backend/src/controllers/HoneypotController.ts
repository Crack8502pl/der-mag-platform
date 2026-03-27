// src/controllers/HoneypotController.ts
// Kontroler API honeypota - zarządzanie logami i statystykami

import { Request, Response } from 'express';
import { HoneypotService } from '../services/HoneypotService';
import { ThreatLevel } from '../entities/HoneypotLog';

export class HoneypotController {
  /**
   * GET /api/admin/honeypot/stats
   * Zwraca statystyki honeypota
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const stats = await HoneypotService.getStats(days);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd pobierania statystyk honeypota' });
    }
  }

  /**
   * GET /api/admin/honeypot/suspicious-ips
   * Zwraca listę podejrzanych adresów IP
   */
  static async getSuspiciousIPs(req: Request, res: Response): Promise<void> {
    try {
      const minHits = parseInt(req.query.minHits as string) || 5;
      const ips = await HoneypotService.getSuspiciousIPs(minHits);
      res.json({ success: true, data: ips });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd pobierania podejrzanych IP' });
    }
  }

  /**
   * GET /api/admin/honeypot/logs
   * Zwraca ostatnie logi honeypota z opcjonalnym filtrowaniem
   */
  static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;

      const rawThreatLevel = req.query.threatLevel as string | undefined;
      let threatLevel: ThreatLevel | undefined;
      if (rawThreatLevel !== undefined) {
        const allowedThreatLevels = Object.values(ThreatLevel) as string[];
        if (!allowedThreatLevels.includes(rawThreatLevel)) {
          res.status(400).json({
            success: false,
            message: 'Nieprawidłowy parametr threatLevel',
          });
          return;
        }
        threatLevel = rawThreatLevel as ThreatLevel;
      }

      const logs = await HoneypotService.getRecentLogs(limit, threatLevel);
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd pobierania logów honeypota' });
    }
  }

  /**
   * GET /api/admin/honeypot/export
   * Eksportuje logi honeypota do JSON lub CSV
   */
  static async exportLogs(req: Request, res: Response): Promise<void> {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'json';
      const days = parseInt(req.query.days as string) || 30;

      if (!['json', 'csv'].includes(format)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowy format (json lub csv)' });
        return;
      }

      const data = await HoneypotService.exportLogs(format, days);
      const filename = `honeypot-logs-${new Date().toISOString().slice(0, 10)}.${format}`;

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
      } else {
        res.setHeader('Content-Type', 'application/json');
      }
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd eksportu logów honeypota' });
    }
  }

  /**
   * DELETE /api/admin/honeypot/cleanup
   * Usuwa stare logi honeypota
   */
  static async cleanupLogs(req: Request, res: Response): Promise<void> {
    try {
      const olderThanDays = parseInt(req.query.olderThanDays as string) || 90;
      const deleted = await HoneypotService.cleanupOldLogs(olderThanDays);
      res.json({
        success: true,
        message: `Usunięto ${deleted} logów starszych niż ${olderThanDays} dni`,
        data: { deleted },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd czyszczenia logów honeypota' });
    }
  }

  /**
   * GET /api/admin/honeypot/check-ip/:ip
   * Sprawdza czy dane IP jest podejrzane
   */
  static async checkIP(req: Request, res: Response): Promise<void> {
    try {
      const { ip } = req.params;
      const threshold = parseInt(req.query.threshold as string) || 5;
      const result = await HoneypotService.isIPSuspicious(ip, threshold);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd sprawdzania IP' });
    }
  }
}

// src/controllers/PrefabricationController.ts
// Kontroler zarządzania prefabrykacją

import { Request, Response } from 'express';
import PrefabricationService from '../services/PrefabricationService';
import NotificationService from '../services/NotificationService';

export class PrefabricationController {
  /**
   * GET /api/prefabrication/:id
   * Szczegóły zadania prefabrykacji
   */
  static async getTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Brak ID zadania'
        });
        return;
      }

      const task = await PrefabricationService.getTask(parseInt(id, 10));

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error('Błąd pobierania zadania prefabrykacji:', error);
      res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Zadanie nie znalezione'
      });
    }
  }

  /**
   * GET /api/prefabrication
   * Lista zadań prefabrykacji
   */
  static async listTasks(req: Request, res: Response): Promise<void> {
    try {
      const { status, assignedToId, subsystemId } = req.query;
      const userId = req.userId;

      const filters: any = {};

      if (status) {
        filters.status = status as string;
      }

      if (assignedToId) {
        filters.assignedToId = parseInt(assignedToId as string, 10);
      } else if (!req.query.all) {
        // Domyślnie pokaż tylko zadania przypisane do obecnego użytkownika
        filters.assignedToId = userId;
      }

      if (subsystemId) {
        filters.subsystemId = parseInt(subsystemId as string, 10);
      }

      const tasks = await PrefabricationService.listTasks(filters);

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('Błąd pobierania listy zadań prefabrykacji:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania listy zadań'
      });
    }
  }

  /**
   * GET /api/prefabrication/:id/devices
   * Tabela urządzeń do konfiguracji
   */
  static async getDevicesTable(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Brak ID zadania'
        });
        return;
      }

      const devicesTable = await PrefabricationService.getDevicesTable(parseInt(id, 10));

      res.json({
        success: true,
        data: devicesTable
      });
    } catch (error) {
      console.error('Błąd pobierania tabeli urządzeń:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd pobierania tabeli urządzeń'
      });
    }
  }

  /**
   * POST /api/prefabrication/:id/configure
   * Konfiguracja urządzenia i przypisanie numeru seryjnego
   */
  static async configureDevice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { ipAssignmentId, serialNumber } = req.body;
      const userId = req.userId;

      if (!id || !ipAssignmentId || !serialNumber || !userId) {
        res.status(400).json({
          success: false,
          message: 'Brak wymaganych parametrów: ipAssignmentId, serialNumber'
        });
        return;
      }

      const device = await PrefabricationService.configureDevice({
        prefabTaskId: parseInt(id, 10),
        ipAssignmentId,
        serialNumber,
        userId
      });

      res.json({
        success: true,
        message: 'Urządzenie skonfigurowane pomyślnie',
        data: device
      });
    } catch (error) {
      console.error('Błąd konfiguracji urządzenia:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd konfiguracji urządzenia'
      });
    }
  }

  /**
   * POST /api/prefabrication/:id/verify
   * Weryfikacja urządzenia
   */
  static async verifyDevice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { deviceId, notes } = req.body;
      const userId = req.userId;

      if (!id || !deviceId || !userId) {
        res.status(400).json({
          success: false,
          message: 'Brak wymaganych parametrów: deviceId'
        });
        return;
      }

      const device = await PrefabricationService.verifyDevice({
        prefabTaskId: parseInt(id, 10),
        deviceId,
        userId,
        notes
      });

      res.json({
        success: true,
        message: 'Urządzenie zweryfikowane pomyślnie',
        data: device
      });
    } catch (error) {
      console.error('Błąd weryfikacji urządzenia:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd weryfikacji urządzenia'
      });
    }
  }

  /**
   * POST /api/prefabrication/:id/complete
   * Zakończenie prefabrykacji
   */
  static async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Brak ID zadania'
        });
        return;
      }

      const task = await PrefabricationService.completeTask(parseInt(id, 10));

      // Wyślij powiadomienie
      await NotificationService.notifyPrefabricationCompleted(task.id);

      res.json({
        success: true,
        message: 'Prefabrykacja zakończona pomyślnie',
        data: task
      });
    } catch (error) {
      console.error('Błąd zakończenia prefabrykacji:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd zakończenia prefabrykacji'
      });
    }
  }

  /**
   * GET /api/prefabrication/:id/label/:deviceId
   * Dane do etykiety urządzenia
   */
  static async getDeviceLabel(req: Request, res: Response): Promise<void> {
    try {
      const { id, deviceId } = req.params;

      if (!id || !deviceId) {
        res.status(400).json({
          success: false,
          message: 'Brak ID zadania lub ID urządzenia'
        });
        return;
      }

      const labelData = await PrefabricationService.getDeviceLabelData(
        parseInt(id, 10),
        parseInt(deviceId, 10)
      );

      res.json({
        success: true,
        data: labelData
      });
    } catch (error) {
      console.error('Błąd pobierania danych etykiety:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd pobierania danych etykiety'
      });
    }
  }
}

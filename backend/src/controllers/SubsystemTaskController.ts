// src/controllers/SubsystemTaskController.ts
// Controller for subsystem task endpoints

import { Request, Response } from 'express';
import { SubsystemTaskService } from '../services/SubsystemTaskService';

export class SubsystemTaskController {
  private subsystemTaskService: SubsystemTaskService;

  constructor() {
    this.subsystemTaskService = new SubsystemTaskService();
  }

  /**
   * POST /api/subsystem-tasks/:taskId/complete-and-create-asset
   * Complete task and create asset in one operation
   */
  completeAndCreateAsset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { taskId } = req.params;
      const {
        assetData,
        deviceSerialNumbers,
        status,
        actualInstallationDate,
        warrantyExpiryDate
      } = req.body;

      // Validate required fields
      if (!assetData || !assetData.name) {
        res.status(400).json({
          success: false,
          message: 'Dane obiektu są wymagane (assetData.name)'
        });
        return;
      }

      const parsedTaskId = parseInt(taskId, 10);
      if (!Number.isInteger(parsedTaskId) || parsedTaskId <= 0) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowe ID zadania'
        });
        return;
      }

      // Parse dates if provided as strings
      const parsedAssetData = {
        ...assetData,
        status: status || assetData.status,
        actualInstallationDate: actualInstallationDate
          ? new Date(actualInstallationDate)
          : (assetData.actualInstallationDate ? new Date(assetData.actualInstallationDate) : null),
        warrantyExpiryDate: warrantyExpiryDate
          ? new Date(warrantyExpiryDate)
          : (assetData.warrantyExpiryDate ? new Date(assetData.warrantyExpiryDate) : null),
        gpsLatitude: assetData.gpsLatitude != null ? parseFloat(assetData.gpsLatitude) : null,
        gpsLongitude: assetData.gpsLongitude != null ? parseFloat(assetData.gpsLongitude) : null
      };

      // Validate parsed GPS values
      if (parsedAssetData.gpsLatitude !== null && isNaN(parsedAssetData.gpsLatitude)) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowa wartość gpsLatitude'
        });
        return;
      }
      if (parsedAssetData.gpsLongitude !== null && isNaN(parsedAssetData.gpsLongitude)) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowa wartość gpsLongitude'
        });
        return;
      }

      const result = await this.subsystemTaskService.completeAndCreateAsset(
        parsedTaskId,
        parsedAssetData,
        deviceSerialNumbers
      );

      // Build success message
      let message = 'Zadanie zakończone i obiekt utworzony pomyślnie';
      if (result.linkedDevices.length > 0) {
        message += ` (połączono ${result.linkedDevices.length} urządzeń)`;
      }

      res.status(201).json({
        success: true,
        message,
        warnings: result.warnings,
        data: result
      });
    } catch (error: any) {
      console.error('Error completing task and creating asset:', error);

      // Return 404 for "not found" errors, 400 for business logic errors
      const status = error.message === 'Zadanie nie znalezione' ? 404 : 400;

      res.status(status).json({
        success: false,
        message: error.message || 'Błąd podczas kończenia zadania i tworzenia obiektu',
        error: error.message
      });
    }
  };
}

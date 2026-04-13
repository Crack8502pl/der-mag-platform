// src/controllers/SubsystemTaskController.ts
// Controller for subsystem task endpoints

import { Request, Response } from 'express';
import { SubsystemTaskService } from '../services/SubsystemTaskService';
import { ASSET_CREATION_BUSINESS_ERRORS } from '../services/AssetCreationService';

// Business error messages that map to HTTP 404
const NOT_FOUND_ERRORS = new Set(['Zadanie nie znalezione']);

/**
 * Parse a date string/value and return a Date.
 * Returns null when the input is null/undefined.
 * Throws a descriptive error when the input is present but invalid.
 */
function parseDateField(value: any, fieldName: string): Date | null {
  if (value == null) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error(`Nieprawidłowa data w polu ${fieldName}`);
  }
  return d;
}

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
      let resolvedTaskId: number;

      if (Number.isInteger(parsedTaskId) && parsedTaskId > 0) {
        resolvedTaskId = parsedTaskId;
      } else {
        // Try resolving by taskNumber string (e.g. "P000001")
        const taskByNumber = await this.subsystemTaskService.getTaskByNumber(taskId);
        if (!taskByNumber) {
          res.status(404).json({
            success: false,
            message: 'Zadanie nie znalezione'
          });
          return;
        }
        resolvedTaskId = taskByNumber.id;
      }

      // Validate deviceSerialNumbers: must be an array of non-empty strings if provided
      if (deviceSerialNumbers !== undefined && deviceSerialNumbers !== null) {
        if (!Array.isArray(deviceSerialNumbers)) {
          res.status(400).json({
            success: false,
            message: 'deviceSerialNumbers musi być tablicą stringów'
          });
          return;
        }
        const invalidElement = deviceSerialNumbers.find(
          (sn: any) => typeof sn !== 'string' || sn.trim() === ''
        );
        if (invalidElement !== undefined) {
          res.status(400).json({
            success: false,
            message: 'Każdy element tablicy deviceSerialNumbers musi być niepustym stringiem'
          });
          return;
        }
      }

      // Parse and validate dates
      let parsedActualInstallationDate: Date | null;
      let parsedWarrantyExpiryDate: Date | null;
      let parsedAssetActualInstallationDate: Date | null;
      let parsedAssetWarrantyExpiryDate: Date | null;
      try {
        parsedActualInstallationDate = parseDateField(actualInstallationDate, 'actualInstallationDate');
        parsedWarrantyExpiryDate = parseDateField(warrantyExpiryDate, 'warrantyExpiryDate');
        parsedAssetActualInstallationDate = parseDateField(assetData.actualInstallationDate, 'assetData.actualInstallationDate');
        parsedAssetWarrantyExpiryDate = parseDateField(assetData.warrantyExpiryDate, 'assetData.warrantyExpiryDate');
      } catch (dateError: any) {
        res.status(400).json({
          success: false,
          message: dateError.message
        });
        return;
      }

      // Parse GPS coordinates
      const rawLat = assetData.gpsLatitude;
      const rawLng = assetData.gpsLongitude;
      const gpsLatitude = rawLat != null ? parseFloat(rawLat) : null;
      const gpsLongitude = rawLng != null ? parseFloat(rawLng) : null;

      if (gpsLatitude !== null && isNaN(gpsLatitude)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowa wartość gpsLatitude' });
        return;
      }
      if (gpsLongitude !== null && isNaN(gpsLongitude)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowa wartość gpsLongitude' });
        return;
      }

      const parsedAssetData = {
        ...assetData,
        status: status || assetData.status,
        actualInstallationDate: parsedActualInstallationDate ?? parsedAssetActualInstallationDate,
        warrantyExpiryDate: parsedWarrantyExpiryDate ?? parsedAssetWarrantyExpiryDate,
        gpsLatitude,
        gpsLongitude
      };

      const result = await this.subsystemTaskService.completeAndCreateAsset(
        resolvedTaskId,
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

      if (NOT_FOUND_ERRORS.has(error.message)) {
        res.status(404).json({
          success: false,
          message: error.message,
          error: error.message
        });
        return;
      }

      if (ASSET_CREATION_BUSINESS_ERRORS.has(error.message)) {
        res.status(400).json({
          success: false,
          message: error.message,
          error: error.message
        });
        return;
      }

      // Unexpected / server-side error
      res.status(500).json({
        success: false,
        message: 'Błąd podczas kończenia zadania i tworzenia obiektu',
        error: error.message
      });
    }
  };
}

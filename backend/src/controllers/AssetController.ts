// src/controllers/AssetController.ts
// Kontroler dla endpointów obiektów (assets)

import { Request, Response } from 'express';
import { AssetService } from '../services/AssetService';
import { DeviceLinkingService } from '../services/DeviceLinkingService';

export class AssetController {
  private assetService: AssetService;
  private deviceLinkingService: DeviceLinkingService;

  constructor() {
    this.assetService = new AssetService();
    this.deviceLinkingService = new DeviceLinkingService();
  }

  /**
   * GET /api/assets
   * Get all assets with filters and pagination
   */
  getAllAssets = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        assetType,
        status,
        contractId,
        subsystemId,
        category,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const result = await this.assetService.getAllAssets(
        {
          assetType: assetType as string,
          status: status as string,
          contractId: contractId ? (isNaN(parseInt(contractId as string)) ? undefined : parseInt(contractId as string)) : undefined,
          subsystemId: subsystemId ? (isNaN(parseInt(subsystemId as string)) ? undefined : parseInt(subsystemId as string)) : undefined,
          category: category as string,
          search: search as string
        },
        {
          page: isNaN(parseInt(page as string)) ? 1 : Math.max(1, parseInt(page as string)),
          limit: isNaN(parseInt(limit as string)) ? 20 : Math.max(1, parseInt(limit as string)),
          sortBy: sortBy as string,
          sortOrder: sortOrder as 'ASC' | 'DESC'
        }
      );

      res.json({
        success: true,
        data: result.assets,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error: any) {
      console.error('Error getting assets:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania obiektów',
        error: error.message
      });
    }
  };

  /**
   * GET /api/assets/:id
   * Get single asset by ID
   */
  getAssetById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const assetId = parseInt(id, 10);

      if (!Number.isInteger(assetId) || assetId <= 0) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowe ID obiektu'
        });
        return;
      }

      const asset = await this.assetService.getAssetById(assetId);

      if (!asset) {
        res.status(404).json({
          success: false,
          message: 'Obiekt nie znaleziony'
        });
        return;
      }

      res.json({
        success: true,
        data: asset
      });
    } catch (error: any) {
      console.error('Error getting asset:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania obiektu',
        error: error.message
      });
    }
  };

  /**
   * GET /api/assets/number/:assetNumber
   * Get asset by asset number (OBJ-XXXXXXMMRR)
   */
  getAssetByNumber = async (req: Request, res: Response): Promise<void> => {
    try {
      const { assetNumber } = req.params;
      const asset = await this.assetService.getAssetByNumber(assetNumber);

      if (!asset) {
        res.status(404).json({
          success: false,
          message: `Obiekt o numerze ${assetNumber} nie znaleziony`
        });
        return;
      }

      res.json({
        success: true,
        data: asset
      });
    } catch (error: any) {
      console.error('Error getting asset by number:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania obiektu',
        error: error.message
      });
    }
  };

  /**
   * GET /api/contracts/:contractId/assets
   * Get all assets for a contract
   */
  getContractAssets = async (req: Request, res: Response): Promise<void> => {
    try {
      const { contractId } = req.params;
      const parsedContractId = parseInt(contractId, 10);

      if (!Number.isInteger(parsedContractId) || parsedContractId <= 0) {
        res.status(400).json({
          success: false,
          message: 'contractId musi być dodatnią liczbą całkowitą'
        });
        return;
      }

      const assets = await this.assetService.getAssetsByContract(parsedContractId);

      res.json({
        success: true,
        data: assets,
        count: assets.length
      });
    } catch (error: any) {
      console.error('Error getting contract assets:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania obiektów kontraktu',
        error: error.message
      });
    }
  };

  /**
   * GET /api/subsystems/:subsystemId/assets
   * Get all assets for a subsystem
   */
  getSubsystemAssets = async (req: Request, res: Response): Promise<void> => {
    try {
      const { subsystemId } = req.params;
      const parsedSubsystemId = parseInt(subsystemId, 10);

      if (!Number.isInteger(parsedSubsystemId) || parsedSubsystemId <= 0) {
        res.status(400).json({
          success: false,
          message: 'subsystemId musi być dodatnią liczbą całkowitą'
        });
        return;
      }

      const assets = await this.assetService.getAssetsBySubsystem(parsedSubsystemId);

      res.json({
        success: true,
        data: assets,
        count: assets.length
      });
    } catch (error: any) {
      console.error('Error getting subsystem assets:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania obiektów podsystemu',
        error: error.message
      });
    }
  };

  /**
   * GET /api/assets/stats
   * Get asset statistics
   */
  getAssetStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.assetService.getAssetStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting asset stats:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania statystyk',
        error: error.message
      });
    }
  };

  /**
   * POST /api/assets
   * Create new asset
   */
  createAsset = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;

      const {
        assetType,
        name,
        category,
        liniaKolejowa,
        kilometraz,
        gpsLatitude,
        gpsLongitude,
        googleMapsUrl,
        miejscowosc,
        contractId,
        subsystemId,
        installationTaskId,
        status,
        plannedInstallationDate,
        actualInstallationDate,
        warrantyExpiryDate,
        bomSnapshot,
        notes,
        photosFolder
      } = req.body;

      // Basic validation
      if (!assetType || !name) {
        res.status(400).json({
          success: false,
          message: 'Typ obiektu i nazwa są wymagane'
        });
        return;
      }

      const asset = await this.assetService.createAsset({
        assetType,
        name,
        category,
        liniaKolejowa,
        kilometraz,
        gpsLatitude: gpsLatitude != null ? (isNaN(parseFloat(gpsLatitude)) ? null : parseFloat(gpsLatitude)) : null,
        gpsLongitude: gpsLongitude != null ? (isNaN(parseFloat(gpsLongitude)) ? null : parseFloat(gpsLongitude)) : null,
        googleMapsUrl,
        miejscowosc,
        contractId: contractId != null ? (isNaN(parseInt(contractId)) ? null : parseInt(contractId)) : null,
        subsystemId: subsystemId != null ? (isNaN(parseInt(subsystemId)) ? null : parseInt(subsystemId)) : null,
        installationTaskId: installationTaskId != null ? (isNaN(parseInt(installationTaskId)) ? null : parseInt(installationTaskId)) : null,
        status,
        plannedInstallationDate: plannedInstallationDate ? new Date(plannedInstallationDate) : null,
        actualInstallationDate: actualInstallationDate ? new Date(actualInstallationDate) : null,
        warrantyExpiryDate: warrantyExpiryDate ? new Date(warrantyExpiryDate) : null,
        bomSnapshot,
        notes,
        photosFolder,
        createdBy: userId
      });

      res.status(201).json({
        success: true,
        message: 'Obiekt utworzony pomyślnie',
        data: asset
      });
    } catch (error: any) {
      console.error('Error creating asset:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Błąd podczas tworzenia obiektu',
        error: error.message
      });
    }
  };

  /**
   * PUT /api/assets/:id
   * Update asset
   */
  updateAsset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const assetId = parseInt(id, 10);

      if (isNaN(assetId) || assetId <= 0) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowe ID obiektu'
        });
        return;
      }

      const updates = { ...req.body };

      // Convert date strings to Date objects
      if (updates.plannedInstallationDate) {
        updates.plannedInstallationDate = new Date(updates.plannedInstallationDate);
      }
      if (updates.actualInstallationDate) {
        updates.actualInstallationDate = new Date(updates.actualInstallationDate);
      }
      if (updates.warrantyExpiryDate) {
        updates.warrantyExpiryDate = new Date(updates.warrantyExpiryDate);
      }
      if (updates.decommissionDate) {
        updates.decommissionDate = new Date(updates.decommissionDate);
      }

      // Convert numeric strings
      if (updates.gpsLatitude != null) {
        updates.gpsLatitude = isNaN(parseFloat(updates.gpsLatitude)) ? null : parseFloat(updates.gpsLatitude);
      }
      if (updates.gpsLongitude != null) {
        updates.gpsLongitude = isNaN(parseFloat(updates.gpsLongitude)) ? null : parseFloat(updates.gpsLongitude);
      }
      if (updates.contractId != null) {
        updates.contractId = isNaN(parseInt(updates.contractId)) ? null : parseInt(updates.contractId);
      }
      if (updates.subsystemId != null) {
        updates.subsystemId = isNaN(parseInt(updates.subsystemId)) ? null : parseInt(updates.subsystemId);
      }
      if (updates.installationTaskId != null) {
        updates.installationTaskId = isNaN(parseInt(updates.installationTaskId)) ? null : parseInt(updates.installationTaskId);
      }

      const asset = await this.assetService.updateAsset(assetId, updates);

      res.json({
        success: true,
        message: 'Obiekt zaktualizowany pomyślnie',
        data: asset
      });
    } catch (error: any) {
      console.error('Error updating asset:', error);
      const statusCode = error.message === 'Obiekt nie znaleziony' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Błąd podczas aktualizacji obiektu',
        error: error.message
      });
    }
  };

  /**
   * PATCH /api/assets/:id/status
   * Update asset status
   */
  updateAssetStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const assetId = parseInt(id, 10);

      if (isNaN(assetId) || assetId <= 0) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowe ID obiektu'
        });
        return;
      }

      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status jest wymagany'
        });
        return;
      }

      const asset = await this.assetService.updateStatus(
        assetId,
        status,
        userId
      );

      res.json({
        success: true,
        message: 'Status obiektu zaktualizowany pomyślnie',
        data: asset
      });
    } catch (error: any) {
      console.error('Error updating asset status:', error);
      const statusCode = error.message === 'Obiekt nie znaleziony' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Błąd podczas aktualizacji statusu',
        error: error.message
      });
    }
  };

  /**
   * DELETE /api/assets/:id
   * Delete (soft delete) asset
   */
  deleteAsset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const assetId = parseInt(id, 10);

      if (isNaN(assetId) || assetId <= 0) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowe ID obiektu'
        });
        return;
      }

      await this.assetService.deleteAsset(assetId);

      res.json({
        success: true,
        message: 'Obiekt usunięty pomyślnie'
      });
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      const statusCode = error.message === 'Obiekt nie znaleziony' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Błąd podczas usuwania obiektu',
        error: error.message
      });
    }
  };

  /**
   * POST /api/assets/:id/devices
   * Link devices to asset by serial numbers
   */
  linkDevices = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const assetId = parseInt(id, 10);

      if (!Number.isInteger(assetId) || assetId <= 0) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowe ID obiektu'
        });
        return;
      }

      const { serialNumbers, bomSnapshot } = req.body;

      if (!serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Lista numerów seryjnych jest wymagana'
        });
        return;
      }

      if (serialNumbers.some((sn: unknown) => typeof sn !== 'string' || (sn as string).trim().length === 0)) {
        res.status(400).json({
          success: false,
          message: 'Każdy numer seryjny musi być niepustym tekstem'
        });
        return;
      }

      const normalizedSerialNumbers: string[] = serialNumbers.map((sn: string) => sn.trim());

      const result = await this.deviceLinkingService.linkDevicesAndUpdateBOM(
        assetId,
        normalizedSerialNumbers,
        bomSnapshot
      );

      const warnings: string[] = [];

      if (result.notFound.length > 0) {
        warnings.push(`Nie znaleziono urządzeń: ${result.notFound.join(', ')}`);
      }

      if (result.alreadyInstalled.length > 0) {
        warnings.push(`Urządzenia już zainstalowane na innym obiekcie: ${result.alreadyInstalled.join(', ')}`);
      }

      res.status(201).json({
        success: true,
        message: `Połączono ${result.linked.length} urządzeń pomyślnie`,
        warnings: warnings.length > 0 ? warnings : undefined,
        data: {
          asset: result.asset,
          linked: result.linked,
          notFound: result.notFound,
          alreadyInstalled: result.alreadyInstalled
        }
      });
    } catch (error: any) {
      console.error('Error linking devices:', error);
      const statusCode = error.message === 'Obiekt nie znaleziony' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Błąd podczas łączenia urządzeń',
        error: error.message
      });
    }
  };

  /**
   * DELETE /api/assets/:id/devices/:deviceId
   * Unlink device from asset
   */
  unlinkDevice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, deviceId } = req.params;
      const assetId = parseInt(id, 10);
      const parsedDeviceId = parseInt(deviceId, 10);

      if (!Number.isInteger(assetId) || assetId <= 0) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowe ID obiektu'
        });
        return;
      }

      if (!Number.isInteger(parsedDeviceId) || parsedDeviceId <= 0) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowe ID urządzenia'
        });
        return;
      }

      const device = await this.deviceLinkingService.unlinkDeviceFromAsset(
        assetId,
        parsedDeviceId
      );

      res.json({
        success: true,
        message: 'Urządzenie odłączone od obiektu',
        data: device
      });
    } catch (error: any) {
      console.error('Error unlinking device:', error);
      const statusCode =
        error.message === 'Urządzenie nie znalezione' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Błąd podczas odłączania urządzenia',
        error: error.message
      });
    }
  };

  /**
   * GET /api/assets/:id/devices
   * Get all devices installed on asset
   */
  getAssetDevices = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const assetId = parseInt(id, 10);

      if (!Number.isInteger(assetId) || assetId <= 0) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowe ID obiektu'
        });
        return;
      }

      const devices = await this.deviceLinkingService.getAssetDevices(assetId);

      res.json({
        success: true,
        data: devices,
        count: devices.length
      });
    } catch (error: any) {
      console.error('Error getting asset devices:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania urządzeń',
        error: error.message
      });
    }
  };

  /**
   * GET /api/assets/:id/bom-validation
   * Validate installed devices against BOM snapshot
   */
  validateBOM = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const assetId = parseInt(id, 10);

      if (!Number.isInteger(assetId) || assetId <= 0) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowe ID obiektu'
        });
        return;
      }

      const validation = await this.deviceLinkingService.validateAgainstBOM(assetId);

      res.json({
        success: true,
        data: validation
      });
    } catch (error: any) {
      console.error('Error validating BOM:', error);
      const statusCode = error.message === 'Obiekt nie znaleziony' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Błąd podczas walidacji BOM',
        error: error.message
      });
    }
  };

  /**
   * POST /api/assets/:id/tasks
   * Create service task for asset
   */
  createServiceTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const assetId = parseInt(id, 10);

      if (!Number.isInteger(assetId) || assetId <= 0) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowe ID obiektu'
        });
        return;
      }

      const {
        taskRole,
        taskName,
        scheduledDate,
        priority,
        assignedTo,
        description
      } = req.body;

      // Validation
      if (!taskRole || !taskName) {
        res.status(400).json({
          success: false,
          message: 'Rola zadania (taskRole) i nazwa zadania (taskName) są wymagane'
        });
        return;
      }

      const result = await this.assetService.createServiceTask(
        assetId,
        {
          taskRole,
          taskName,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          priority: priority != null ? parseInt(priority, 10) : undefined,
          assignedTo: assignedTo != null ? parseInt(assignedTo, 10) : undefined,
          description
        },
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Zadanie serwisowe utworzone pomyślnie',
        data: {
          task: {
            id: result.task.id,
            number: result.task.taskNumber,
            name: result.task.taskName,
            type: result.task.taskType,
            status: result.task.status,
            linkedAssetId: result.task.linkedAssetId,
            taskRole: result.task.taskRole
          },
          asset: {
            id: result.asset.id,
            assetNumber: result.asset.assetNumber,
            status: result.asset.status
          }
        }
      });
    } catch (error: any) {
      console.error('Error creating service task:', error);
      const statusCode = error.message === 'Obiekt nie znaleziony' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Błąd podczas tworzenia zadania serwisowego',
        error: error.message
      });
    }
  };
}

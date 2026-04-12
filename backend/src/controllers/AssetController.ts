// src/controllers/AssetController.ts
// Kontroler dla endpointów obiektów (assets)

import { Request, Response } from 'express';
import { AssetService } from '../services/AssetService';

export class AssetController {
  private assetService: AssetService;

  constructor() {
    this.assetService = new AssetService();
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
      const asset = await this.assetService.getAssetById(parseInt(id));

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
      const assets = await this.assetService.getAssetsByContract(parseInt(contractId));

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
      const assets = await this.assetService.getAssetsBySubsystem(parseInt(subsystemId));

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
}

export default new AssetController();

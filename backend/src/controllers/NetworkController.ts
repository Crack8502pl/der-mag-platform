// src/controllers/NetworkController.ts
// Kontroler dla zarządzania siecią IP

import { Request, Response } from 'express';
import { NetworkPoolService } from '../services/NetworkPoolService';
import { NetworkAllocationService } from '../services/NetworkAllocationService';
import { IPAssignmentService } from '../services/IPAssignmentService';
import { DeviceCategory } from '../entities/DeviceIPAssignment';

export class NetworkController {
  private poolService: NetworkPoolService;
  private allocationService: NetworkAllocationService;
  private ipService: IPAssignmentService;

  constructor() {
    this.poolService = new NetworkPoolService();
    this.allocationService = new NetworkAllocationService();
    this.ipService = new IPAssignmentService();
  }

  // === Network Pools ===

  /**
   * GET /api/network/pools
   */
  getPools = async (req: Request, res: Response): Promise<void> => {
    try {
      const { activeOnly } = req.query;
      const pools = await this.poolService.getAllPools(activeOnly === 'true');

      res.json({
        success: true,
        data: pools
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania pul IP',
        error: error.message
      });
    }
  };

  /**
   * POST /api/network/pools
   */
  createPool = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, cidrRange, priority, description } = req.body;

      if (!name || !cidrRange || !priority) {
        res.status(400).json({
          success: false,
          message: 'Brakuje wymaganych pól: name, cidrRange, priority'
        });
        return;
      }

      const pool = await this.poolService.createPool({
        name,
        cidrRange,
        priority,
        description
      });

      res.status(201).json({
        success: true,
        message: 'Pula IP utworzona pomyślnie',
        data: pool
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas tworzenia puli IP',
        error: error.message
      });
    }
  };

  /**
   * PUT /api/network/pools/:id
   */
  updatePool = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const pool = await this.poolService.updatePool(parseInt(id), updates);

      res.json({
        success: true,
        message: 'Pula IP zaktualizowana pomyślnie',
        data: pool
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas aktualizacji puli IP',
        error: error.message
      });
    }
  };

  /**
   * DELETE /api/network/pools/:id
   */
  deletePool = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.poolService.deletePool(parseInt(id));

      res.json({
        success: true,
        message: 'Pula IP usunięta pomyślnie'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas usuwania puli IP',
        error: error.message
      });
    }
  };

  // === Network Allocations ===

  /**
   * GET /api/network/allocations
   */
  getAllocations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { contractId } = req.query;
      const allocations = await this.allocationService.getAllAllocations(
        contractId ? parseInt(contractId as string) : undefined
      );

      res.json({
        success: true,
        data: allocations
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania alokacji',
        error: error.message
      });
    }
  };

  /**
   * POST /api/subsystems/:id/allocate-network
   */
  allocateNetwork = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const allocation = await this.allocationService.allocateNetwork(parseInt(id));

      res.status(201).json({
        success: true,
        message: 'Sieć przydzielona pomyślnie',
        data: allocation
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas alokacji sieci',
        error: error.message
      });
    }
  };

  /**
   * GET /api/subsystems/:id/ip-matrix
   */
  getIPMatrix = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const allocation = await this.allocationService.getAllocationBySubsystem(
        parseInt(id)
      );

      if (!allocation) {
        res.status(404).json({
          success: false,
          message: 'Brak alokacji sieci dla tego podsystemu'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          allocation,
          matrix: allocation.deviceAssignments || []
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania macierzy IP',
        error: error.message
      });
    }
  };

  // === IP Assignments ===

  /**
   * POST /api/network/assignments
   */
  assignIP = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        allocationId,
        deviceCategory,
        deviceType,
        hostname,
        description,
        serialNumber
      } = req.body;

      if (!allocationId || !deviceCategory || !deviceType || !hostname) {
        res.status(400).json({
          success: false,
          message: 'Brakuje wymaganych pól: allocationId, deviceCategory, deviceType, hostname'
        });
        return;
      }

      const assignment = await this.ipService.assignIP({
        allocationId,
        deviceCategory: deviceCategory as DeviceCategory,
        deviceType,
        hostname,
        description,
        serialNumber
      });

      res.status(201).json({
        success: true,
        message: 'IP przydzielone pomyślnie',
        data: assignment
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas przydzielania IP',
        error: error.message
      });
    }
  };

  /**
   * POST /api/network/assignments/:id/configure
   */
  configureDevice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { firmwareVersion } = req.body;
      const userId = req.userId!;

      const assignment = await this.ipService.configureDevice(
        parseInt(id),
        userId,
        firmwareVersion
      );

      res.json({
        success: true,
        message: 'Urządzenie skonfigurowane pomyślnie',
        data: assignment
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas konfiguracji urządzenia',
        error: error.message
      });
    }
  };

  /**
   * POST /api/network/assignments/:id/verify
   */
  verifyDevice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { testResults } = req.body;
      const userId = req.userId!;

      const assignment = await this.ipService.verifyDevice(
        parseInt(id),
        userId,
        testResults
      );

      res.json({
        success: true,
        message: 'Urządzenie zweryfikowane pomyślnie',
        data: assignment
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: 'Błąd podczas weryfikacji urządzenia',
        error: error.message
      });
    }
  };
}

// src/controllers/NetworkTopologyController.ts
// Controller for Network Topology CRUD endpoints

import { Request, Response } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import networkTopologyService from '../services/networkTopology.service';
import {
  CreateNetworkTopologyDto,
  UpdateNetworkTopologyDto,
} from '../dto/network-topology.dto';

export class NetworkTopologyController {
  /**
   * GET /api/contracts/:contractId/subsystems/:subsystemIndex/topology
   * Pobierz najnowszą wersję topologii
   */
  getLatest = async (req: Request, res: Response): Promise<void> => {
    try {
      const contractId = parseInt(req.params.contractId, 10);
      const subsystemIndex = parseInt(req.params.subsystemIndex, 10);

      if (isNaN(contractId) || isNaN(subsystemIndex)) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nieprawidłowy contractId lub subsystemIndex',
        });
        return;
      }

      const topology = await networkTopologyService.getLatest(contractId, subsystemIndex);
      if (!topology) {
        res.status(404).json({
          success: false,
          error: 'TOPOLOGY_NOT_FOUND',
          message: 'Topologia nie znaleziona',
        });
        return;
      }

      res.json({ success: true, data: topology });
    } catch (error: any) {
      console.error('Error in getLatest:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * GET /api/topologies/:id
   * Pobierz topologię po ID
   */
  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const topology = await networkTopologyService.getById(id);
      if (!topology) {
        res.status(404).json({
          success: false,
          error: 'TOPOLOGY_NOT_FOUND',
          message: 'Topologia nie znaleziona',
        });
        return;
      }

      res.json({ success: true, data: topology });
    } catch (error: any) {
      console.error('Error in getById:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * GET /api/contracts/:contractId/topologies
   * Pobierz wszystkie topologie dla kontraktu (tylko najnowsze wersje)
   */
  getAllByContract = async (req: Request, res: Response): Promise<void> => {
    try {
      const contractId = parseInt(req.params.contractId, 10);
      if (isNaN(contractId)) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nieprawidłowy contractId',
        });
        return;
      }

      const topologies = await networkTopologyService.getAllByContract(contractId);
      res.json({ success: true, data: topologies });
    } catch (error: any) {
      console.error('Error in getAllByContract:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * POST /api/topologies
   * Utwórz nową topologię
   */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto = plainToClass(CreateNetworkTopologyDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Błąd walidacji',
          details: errors.map(e => ({ field: e.property, constraints: e.constraints })),
        });
        return;
      }

      const topology = await networkTopologyService.create(dto);
      res.status(201).json({ success: true, data: topology });
    } catch (error: any) {
      console.error('Error in create:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * PUT /api/contracts/:contractId/subsystems/:subsystemIndex/topology
   * Utwórz nową wersję topologii (immutable update)
   */
  createNewVersion = async (req: Request, res: Response): Promise<void> => {
    try {
      const contractId = parseInt(req.params.contractId, 10);
      const subsystemIndex = parseInt(req.params.subsystemIndex, 10);

      if (isNaN(contractId) || isNaN(subsystemIndex)) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nieprawidłowy contractId lub subsystemIndex',
        });
        return;
      }

      const dto = plainToClass(UpdateNetworkTopologyDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Błąd walidacji',
          details: errors.map(e => ({ field: e.property, constraints: e.constraints })),
        });
        return;
      }

      const topology = await networkTopologyService.createNewVersion(contractId, subsystemIndex, dto);
      res.json({ success: true, data: topology });
    } catch (error: any) {
      console.error('Error in createNewVersion:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * GET /api/contracts/:contractId/subsystems/:subsystemIndex/topology/history
   * Historia wersji z paginacją
   */
  getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const contractId = parseInt(req.params.contractId, 10);
      const subsystemIndex = parseInt(req.params.subsystemIndex, 10);

      if (isNaN(contractId) || isNaN(subsystemIndex)) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nieprawidłowy contractId lub subsystemIndex',
        });
        return;
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      if (page < 1 || limit < 1) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Parametry page i limit muszą być większe od 0',
        });
        return;
      }

      const result = await networkTopologyService.getHistory(contractId, subsystemIndex, page, limit);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error in getHistory:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };

  /**
   * DELETE /api/contracts/:contractId/subsystems/:subsystemIndex/topology
   * Soft-delete najnowszej wersji
   */
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const contractId = parseInt(req.params.contractId, 10);
      const subsystemIndex = parseInt(req.params.subsystemIndex, 10);

      if (isNaN(contractId) || isNaN(subsystemIndex)) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Nieprawidłowy contractId lub subsystemIndex',
        });
        return;
      }

      await networkTopologyService.delete(contractId, subsystemIndex);
      res.json({ success: true, message: 'Topologia usunięta pomyślnie' });
    } catch (error: any) {
      console.error('Error in delete:', error);
      if (error.message === 'TOPOLOGY_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'TOPOLOGY_NOT_FOUND',
          message: 'Topologia nie znaleziona',
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Błąd serwera',
      });
    }
  };
}

export default new NetworkTopologyController();

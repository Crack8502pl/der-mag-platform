// src/controllers/BomResolverController.ts
// Controller for the BOM resolver orchestration endpoint

import { Request, Response } from 'express';
import { BomResolverService, BomResolveRequest } from '../services/BomResolverService';
import { SubsystemType } from '../entities/BomSubsystemTemplate';

export class BomResolverController {
  /**
   * POST /api/bom-resolver/resolve
   *
   * Body (JSON):
   * {
   *   subsystemType: string,          // required
   *   taskVariant?: string | null,
   *   cameraCount?: number,
   *   recordingDays?: number,
   *   bitrateMbps?: number,
   *   configParams?: Record<string, unknown>
   * }
   */
  static async resolve(req: Request, res: Response): Promise<void> {
    try {
      const {
        subsystemType,
        taskVariant,
        cameraCount,
        recordingDays,
        bitrateMbps,
        configParams
      } = req.body as Partial<BomResolveRequest>;

      if (!subsystemType) {
        res.status(400).json({
          success: false,
          message: 'Pole subsystemType jest wymagane'
        });
        return;
      }

      const validTypes = Object.values(SubsystemType) as string[];
      if (!validTypes.includes(subsystemType)) {
        res.status(400).json({
          success: false,
          message: `Nieprawidłowy typ podsystemu: ${subsystemType}. Dozwolone: ${validTypes.join(', ')}`
        });
        return;
      }

      const result = await BomResolverService.resolve({
        subsystemType: subsystemType as SubsystemType,
        taskVariant: taskVariant ?? null,
        cameraCount: cameraCount !== undefined ? Number(cameraCount) : undefined,
        recordingDays: recordingDays !== undefined ? Number(recordingDays) : undefined,
        bitrateMbps: bitrateMbps !== undefined ? Number(bitrateMbps) : undefined,
        configParams: configParams ?? {}
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('BomResolverController.resolve error:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd rozwiązywania BOM',
        error: error.message
      });
    }
  }
}

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
        taskType,
        taskVariant,
        cameraCount,
        recordingDays,
        retentionDays,
        bitrateMbps,
        configParams,
        isStandaloneNastawnia,
        selectedRecorderId
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
        taskType,
        taskVariant: taskVariant ?? null,
        cameraCount: cameraCount !== undefined ? Number(cameraCount) : undefined,
        recordingDays: recordingDays !== undefined ? Number(recordingDays) : undefined,
        retentionDays: retentionDays !== undefined ? Number(retentionDays) : undefined,
        bitrateMbps: bitrateMbps !== undefined ? Number(bitrateMbps) : undefined,
        configParams: configParams ?? {},
        isStandaloneNastawnia: isStandaloneNastawnia ?? false,
        selectedRecorderId: selectedRecorderId ?? null
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: unknown) {
      console.error('BomResolverController.resolve error:', error);
      const message = error instanceof Error ? error.message : 'Nieznany błąd';
      res.status(500).json({
        success: false,
        message: 'Błąd rozwiązywania BOM',
        error: message
      });
    }
  }

  /**
   * POST /api/bom-resolver/resolve-bulk
   * Body: { requests: BomResolveRequest[] }
   */
  static async resolveBulk(req: Request, res: Response): Promise<void> {
    try {
      const { requests } = req.body as { requests: Partial<BomResolveRequest>[] };
      if (!Array.isArray(requests) || requests.length === 0) {
        res.status(400).json({ success: false, message: 'Pole requests musi być niepustą tablicą' });
        return;
      }

      const validTypes = Object.values(SubsystemType) as string[];
      for (const r of requests) {
        if (!r.subsystemType || !validTypes.includes(r.subsystemType as string)) {
          res.status(400).json({ success: false, message: `Nieprawidłowy lub brakujący subsystemType: ${r.subsystemType}` });
          return;
        }
      }

      const results = await Promise.all(
        requests.map(r => BomResolverService.resolve({
          subsystemType: r.subsystemType as SubsystemType,
          taskType: r.taskType,
          taskVariant: r.taskVariant ?? null,
          cameraCount: r.cameraCount !== undefined ? Number(r.cameraCount) : undefined,
          recordingDays: r.recordingDays !== undefined ? Number(r.recordingDays) : undefined,
          retentionDays: r.retentionDays !== undefined ? Number(r.retentionDays) : undefined,
          bitrateMbps: r.bitrateMbps !== undefined ? Number(r.bitrateMbps) : undefined,
          configParams: r.configParams ?? {},
          isStandaloneNastawnia: r.isStandaloneNastawnia ?? false,
          selectedRecorderId: r.selectedRecorderId ?? null
        }))
      );

      res.json({ success: true, data: results });
    } catch (error: unknown) {
      console.error('BomResolverController.resolveBulk error:', error);
      const message = error instanceof Error ? error.message : 'Nieznany błąd';
      res.status(500).json({ success: false, message: 'Błąd bulk resolve BOM', error: message });
    }
  }

  /**
   * GET /api/bom-resolver/needs-recorder?subsystemType=X&taskType=Y&isStandaloneNastawnia=false
   */
  static async checkNeedsRecorder(req: Request, res: Response): Promise<void> {
    try {
      const { subsystemType, taskType, isStandaloneNastawnia } = req.query as Record<string, string>;
      if (!subsystemType || !taskType) {
        res.status(400).json({ success: false, message: 'Wymagane parametry: subsystemType, taskType' });
        return;
      }

      const validTypes = Object.values(SubsystemType) as string[];
      if (!validTypes.includes(subsystemType)) {
        res.status(400).json({ success: false, message: `Nieprawidłowy subsystemType: ${subsystemType}` });
        return;
      }

      const needsRecorder = BomResolverService.needsRecorder(
        subsystemType as SubsystemType,
        taskType,
        isStandaloneNastawnia === 'true'
      );
      res.json({ success: true, data: { needsRecorder } });
    } catch (error: unknown) {
      console.error('BomResolverController.checkNeedsRecorder error:', error);
      const message = error instanceof Error ? error.message : 'Nieznany błąd';
      res.status(500).json({ success: false, message: 'Błąd sprawdzania needsRecorder', error: message });
    }
  }
}

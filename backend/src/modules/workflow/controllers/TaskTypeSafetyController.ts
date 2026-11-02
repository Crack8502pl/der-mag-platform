// src/modules/workflow/controllers/TaskTypeSafetyController.ts
// Panel typów zadań (tylko admin): /api/admin/task-types – przełącznik „Krytyczny dla bezpieczeństwa”.

import { Request, Response } from 'express';
import { serverLogger } from '../../../utils/logger';
import { WorkflowError } from '../errors';
import { taskTypeSafetyService } from '../services/TaskTypeSafetyService';
import { parseId } from '../validation/parseInput';

function fail(res: Response, error: unknown, fallback: string): void {
  if (error instanceof WorkflowError) {
    res.status(error.status).json({ success: false, code: error.code, message: error.message });
    return;
  }
  serverLogger.error(`[Workflow] ${fallback}:`, error);
  res.status(500).json({ success: false, message: fallback });
}

export class TaskTypeSafetyController {
  static async list(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await taskTypeSafetyService.list() });
    } catch (error) {
      fail(res, error, 'Nie udało się pobrać typów zadań');
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseId(req.params.id, 'identyfikator typu zadania');
      const result = await taskTypeSafetyService.setSafetyCritical(id, req.body, req.userId!);
      res.json({
        success: true,
        message: result.taskType.safetyCritical
          ? `Typ zadania „${result.taskType.name}” oznaczono jako krytyczny dla bezpieczeństwa`
          : `Typ zadania „${result.taskType.name}” nie jest już oznaczony jako krytyczny dla bezpieczeństwa`,
        data: result.taskType,
        refreshedDrafts: result.refreshedDrafts,
      });
    } catch (error) {
      fail(res, error, 'Nie udało się zapisać typu zadania');
    }
  }
}

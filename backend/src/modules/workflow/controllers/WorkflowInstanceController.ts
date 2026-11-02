import { Request, Response } from 'express';
import { EffectivePermissionsService } from '../../function-groups/services/EffectivePermissionsService';
import { serverLogger } from '../../../utils/logger';
import { WorkflowError } from '../errors';
import { parseId } from '../validation/parseInput';
import { workflowInstances, type WorkflowInstanceFilters } from '../services/WorkflowInstanceService';
import type { WorkflowActor } from '../services/WorkflowService';

type Operation = (req: Request, actor: WorkflowActor) => Promise<unknown>;

function handle(operation: Operation, status = 200) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const effective = await EffectivePermissionsService.forRequest(req);
      if (!req.userId || !effective) throw new WorkflowError('FORBIDDEN', 'Brak przypisanej roli.');
      const data = await operation(req, { id: req.userId, permissions: effective.permissions });
      res.status(status).json({ success: true, data });
    } catch (error) {
      if (error instanceof WorkflowError) {
        res.status(error.status).json({ success: false, code: error.code, message: error.message });
      } else {
        serverLogger.error('[Workflow] Błąd realizacji procesu:', error);
        res.status(500).json({ success: false, message: 'Nie udało się wykonać operacji procesu.' });
      }
    }
  };
}

export class WorkflowInstanceController {
  static start = handle((req, actor) => workflowInstances.start(req.body ?? {}, actor), 201);
  static getById = handle((req, actor) => workflowInstances.getById(parseId(req.params.id), actor));
  static mySteps = handle((_req, actor) => workflowInstances.mySteps(actor));
  static complete = handle((req, actor) => workflowInstances.complete(parseId(req.params.id), actor));
  static force = handle((req, actor) => workflowInstances.force(parseId(req.params.id), req.body ?? {}, actor));
  static cancel = handle((req, actor) => workflowInstances.cancel(parseId(req.params.id), req.body ?? {}, actor));
  static list = handle((req, actor) => {
    const filters: WorkflowInstanceFilters = {};
    for (const key of ['definitionId', 'subjectId'] as const) {
      if (req.query[key] !== undefined) filters[key] = parseId(req.query[key], 'identyfikator filtra');
    }
    if (req.query.status !== undefined) filters.status = String(req.query.status) as WorkflowInstanceFilters['status'];
    if (req.query.subjectType !== undefined) filters.subjectType = String(req.query.subjectType) as WorkflowInstanceFilters['subjectType'];
    const step = req.query.stepKey ?? req.query.step;
    if (step !== undefined) {
      if (typeof step !== 'string' || !step.trim() || step.length > 100) throw new WorkflowError('VALIDATION_FAILED', 'Nieprawidłowy etap filtra.');
      filters.stepKey = step;
    }
    if (req.query.overdue !== undefined) {
      if (!['true', 'false'].includes(String(req.query.overdue))) throw new WorkflowError('VALIDATION_FAILED', 'Nieprawidłowy filtr opóźnienia.');
      filters.overdue = req.query.overdue === 'true';
    }
    return workflowInstances.list(filters, actor);
  });
}

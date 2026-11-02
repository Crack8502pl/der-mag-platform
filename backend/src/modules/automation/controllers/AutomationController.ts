// src/modules/automation/controllers/AutomationController.ts

import { Request, Response } from 'express';
import { AppDataSource } from '../../../config/database';
import { Task } from '../../../entities/Task';
import { EffectivePermissionsService } from '../../function-groups/services/EffectivePermissionsService';
import { automationRegistry } from '../actions';
import { AutomationError } from '../errors';
import { automationChains, automationExecution, automationStore } from '../runtime';
import { serverLogger } from '../../../utils/logger';

const DEFAULT_RUN_LIMIT = 50;
const MAX_RUN_LIMIT = 200;

function fail(res: Response, error: unknown, fallback: string): void {
  if (error instanceof AutomationError) {
    res.status(error.status).json({ success: false, code: error.code, message: error.message, details: error.details });
    return;
  }
  serverLogger.error(`[Automation] ${fallback}:`, error);
  res.status(500).json({ success: false, message: fallback });
}

const single = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

export class AutomationController {
  static async listActions(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await automationRegistry.describe() });
    } catch (error) {
      fail(res, error, 'Nie udało się pobrać katalogu klocków');
    }
  }

  static async getChains(req: Request, res: Response): Promise<void> {
    try {
      const owner = automationChains.parseOwner(single(req.query.ownerType), single(req.query.ownerId), single(req.query.eventType));
      const chains = await automationChains.find(owner.ownerType, owner.ownerId, owner.eventType);
      res.json({ success: true, data: owner.eventType ? (chains[0] ?? null) : chains });
    } catch (error) {
      fail(res, error, 'Nie udało się pobrać łańcucha automatyzacji');
    }
  }

  static async saveChain(req: Request, res: Response): Promise<void> {
    try {
      const effective = await EffectivePermissionsService.forRequest(req);
      if (!effective) {
        res.status(403).json({ success: false, message: 'Brak przypisanej roli' });
        return;
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const chain = await automationChains.save({
        ownerType: single(req.query.ownerType) ?? body.ownerType,
        ownerId: single(req.query.ownerId) ?? body.ownerId,
        eventType: single(req.query.eventType) ?? body.eventType,
        steps: body.steps,
        onError: body.onError,
      }, { id: req.userId!, permissions: effective.permissions });
      res.json({ success: true, message: 'Łańcuch automatyzacji zapisany', data: chain });
    } catch (error) {
      fail(res, error, 'Nie udało się zapisać łańcucha automatyzacji');
    }
  }

  static async testChain(req: Request, res: Response): Promise<void> {
    try {
      const chainId = Number(req.params.id);
      const taskId = Number((req.body ?? {}).taskId);
      if (!Number.isInteger(chainId) || chainId <= 0) throw new AutomationError('VALIDATION_FAILED', 'Nieprawidłowy identyfikator łańcucha.');
      if (!Number.isInteger(taskId) || taskId <= 0) throw new AutomationError('VALIDATION_FAILED', 'Wybierz zadanie, na którym chcesz przetestować łańcuch.');
      const chain = await automationChains.getById(chainId);
      if (!chain) throw new AutomationError('CHAIN_NOT_FOUND', 'Nie znaleziono łańcucha automatyzacji.');
      const task = await AppDataSource.getRepository(Task).findOne({ where: { id: taskId } });
      if (!task) throw new AutomationError('TASK_NOT_FOUND', 'Nie znaleziono zadania.');
      const result = await automationExecution.runTest(chain, taskId, req.userId!);
      res.json({ success: true, data: { ...result.run, steps: result.steps } });
    } catch (error) {
      fail(res, error, 'Nie udało się wykonać testu łańcucha');
    }
  }

  static async listRuns(req: Request, res: Response): Promise<void> {
    try {
      const owner = automationChains.parseOwner(single(req.query.ownerType), single(req.query.ownerId));
      const requested = Number(single(req.query.limit));
      const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, MAX_RUN_LIMIT) : DEFAULT_RUN_LIMIT;
      const runs = await automationStore.listRuns(owner.ownerType, owner.ownerId, limit);
      res.json({ success: true, data: runs.map(({ run, steps }) => ({ ...run, steps })) });
    } catch (error) {
      fail(res, error, 'Nie udało się pobrać historii uruchomień');
    }
  }
}

// src/modules/workflow/controllers/WorkflowController.ts
// API procesów: /api/workflows (definicje) i /api/workflows/versions/:id (wersje).

import { Request, Response } from 'express';
import { serverLogger } from '../../../utils/logger';
import { EffectivePermissionsService } from '../../function-groups/services/EffectivePermissionsService';
import { WorkflowError } from '../errors';
import { workflowService, type WorkflowActor } from '../services/WorkflowService';
import { parseId } from '../validation/parseInput';

function fail(res: Response, error: unknown, fallback: string): void {
  if (error instanceof WorkflowError) {
    res.status(error.status).json({ success: false, code: error.code, message: error.message, issues: error.issues ?? [] });
    return;
  }
  serverLogger.error(`[Workflow] ${fallback}:`, error);
  res.status(500).json({ success: false, message: fallback });
}

async function actorFor(req: Request): Promise<WorkflowActor> {
  const effective = await EffectivePermissionsService.forRequest(req);
  if (!effective || !req.userId) throw new WorkflowError('FORBIDDEN', 'Brak przypisanej roli.');
  return { id: req.userId, permissions: effective.permissions };
}

type Handler = (req: Request, res: Response) => Promise<void>;

function handle(fallback: string, handler: Handler): Handler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      fail(res, error, fallback);
    }
  };
}

export class WorkflowController {
  static list = handle('Nie udało się pobrać listy procesów', async (_req, res) => {
    res.json({ success: true, data: await workflowService.listDefinitions() });
  });

  static create = handle('Nie udało się utworzyć procesu', async (req, res) => {
    const definition = await workflowService.createDefinition(req.body, await actorFor(req));
    res.status(201).json({ success: true, message: 'Proces utworzony', data: definition });
  });

  static getById = handle('Nie udało się pobrać procesu', async (req, res) => {
    res.json({ success: true, data: await workflowService.getDefinition(parseId(req.params.id, 'identyfikator procesu')) });
  });

  static update = handle('Nie udało się zapisać procesu', async (req, res) => {
    const id = parseId(req.params.id, 'identyfikator procesu');
    const definition = await workflowService.updateDefinition(id, req.body, await actorFor(req));
    res.json({ success: true, message: 'Proces zapisany', data: definition });
  });

  static remove = handle('Nie udało się usunąć procesu', async (req, res) => {
    const id = parseId(req.params.id, 'identyfikator procesu');
    await workflowService.deleteDefinition(id, await actorFor(req));
    res.json({ success: true, message: 'Proces usunięty' });
  });

  static listVersions = handle('Nie udało się pobrać wersji procesu', async (req, res) => {
    res.json({ success: true, data: await workflowService.listVersions(parseId(req.params.id, 'identyfikator procesu')) });
  });

  static getVersion = handle('Nie udało się pobrać wersji procesu', async (req, res) => {
    res.json({ success: true, data: await workflowService.getVersion(parseId(req.params.versionId, 'identyfikator wersji')) });
  });

  static saveDraft = handle('Nie udało się zapisać wersji roboczej', async (req, res) => {
    const versionId = parseId(req.params.versionId, 'identyfikator wersji');
    const { version, warning } = await workflowService.saveDraft(versionId, req.body, await actorFor(req));
    res.json({ success: true, message: 'Wersja robocza zapisana', data: version, ...(warning ? { warning } : {}) });
  });

  static nextVersion = handle('Nie udało się utworzyć nowej wersji', async (req, res) => {
    const versionId = parseId(req.params.versionId, 'identyfikator wersji');
    const version = await workflowService.createNextVersion(versionId, await actorFor(req));
    res.status(201).json({ success: true, message: `Utworzono wersję roboczą ${version.version}`, data: version });
  });

  static validate = handle('Nie udało się sprawdzić wersji procesu', async (req, res) => {
    const result = await workflowService.validateVersion(parseId(req.params.versionId, 'identyfikator wersji'));
    res.json({ success: true, data: result });
  });

  static publish = handle('Nie udało się opublikować wersji', async (req, res) => {
    const versionId = parseId(req.params.versionId, 'identyfikator wersji');
    const { version, supersededVersionId } = await workflowService.publishVersion(versionId, await actorFor(req));
    res.json({
      success: true,
      message: `Opublikowano wersję ${version.version}`,
      data: { ...version, supersededVersionId },
    });
  });
}

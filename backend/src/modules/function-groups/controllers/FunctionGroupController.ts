// src/modules/function-groups/controllers/FunctionGroupController.ts
// API funkcji (tylko admin): /api/admin/function-groups oraz /api/admin/users/:id/function-groups

import { Request, Response } from 'express';
import { FunctionGroupError, FunctionGroupService } from '../services/FunctionGroupService';

function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function handleError(res: Response, error: unknown, fallback: string): void {
  if (error instanceof FunctionGroupError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }
  console.error(`${fallback}:`, error);
  res.status(500).json({ success: false, message: fallback });
}

function withId(handler: (req: Request, res: Response, id: number) => Promise<void>, param = 'id') {
  return async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params[param]);
    if (!id) {
      res.status(400).json({ success: false, message: 'Nieprawidłowy identyfikator' });
      return;
    }
    await handler(req, res, id);
  };
}

export class FunctionGroupController {
  static async list(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: await FunctionGroupService.list() });
    } catch (error) {
      handleError(res, error, 'Błąd pobierania funkcji');
    }
  }

  static getById = withId(async (_req, res, id) => {
    try {
      res.json({ success: true, data: await FunctionGroupService.getById(id) });
    } catch (error) {
      handleError(res, error, 'Błąd pobierania funkcji');
    }
  });

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const group = await FunctionGroupService.create(req.body ?? {}, req.userId ?? null);
      res.status(201).json({ success: true, data: group });
    } catch (error) {
      handleError(res, error, 'Błąd tworzenia funkcji');
    }
  }

  static update = withId(async (req, res, id) => {
    try {
      res.json({ success: true, data: await FunctionGroupService.update(id, req.body ?? {}, req.userId ?? null) });
    } catch (error) {
      handleError(res, error, 'Błąd edycji funkcji');
    }
  });

  static deactivate = withId(async (req, res, id) => {
    try {
      res.json({ success: true, data: await FunctionGroupService.deactivate(id, req.userId ?? null) });
    } catch (error) {
      handleError(res, error, 'Błąd dezaktywacji funkcji');
    }
  });

  static listMembers = withId(async (_req, res, id) => {
    try {
      res.json({ success: true, data: await FunctionGroupService.listMembers(id) });
    } catch (error) {
      handleError(res, error, 'Błąd pobierania członków funkcji');
    }
  });

  static addMember = withId(async (req, res, id) => {
    try {
      const membership = await FunctionGroupService.addMember(id, req.body ?? {}, req.userId ?? null);
      res.status(201).json({ success: true, data: membership });
    } catch (error) {
      handleError(res, error, 'Błąd dodawania osoby do funkcji');
    }
  });

  static removeMember = withId(async (req, res, id) => {
    const userId = parseId(req.params.userId);
    if (!userId) {
      res.status(400).json({ success: false, message: 'Nieprawidłowy identyfikator osoby' });
      return;
    }
    try {
      res.json({ success: true, data: await FunctionGroupService.removeMember(id, userId, req.userId ?? null) });
    } catch (error) {
      handleError(res, error, 'Błąd odbierania funkcji');
    }
  });

  static listForUser = withId(async (_req, res, id) => {
    try {
      res.json({ success: true, data: await FunctionGroupService.listForUser(id) });
    } catch (error) {
      handleError(res, error, 'Błąd pobierania funkcji użytkownika');
    }
  });
}

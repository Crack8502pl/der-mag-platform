// src/middleware/CompletionOrderAccess.ts
// Middleware sprawdzające dostęp do zlecenia kompletacji wskazanego przez :id

import { Request, Response, NextFunction } from 'express';
import { RolePermissions } from '../entities/Role';
import { checkCompletionOrderAccess, hasPrivilegedCompletionAccess } from '../services/CompletionOrderAccessService';
import { serverLogger } from '../utils/logger';

export const requireCompletionOrderAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, message: 'Brak autoryzacji' });
      return;
    }

    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      res.status(404).json({ success: false, message: 'Zlecenie kompletacji nie znalezione' });
      return;
    }

    const result = await checkCompletionOrderAccess(req.userId, orderId);
    if (result === 'unauthorized') {
      res.status(401).json({ success: false, message: 'Użytkownik nie istnieje' });
      return;
    }
    if (result === 'not_found') {
      res.status(404).json({ success: false, message: 'Zlecenie kompletacji nie znalezione' });
      return;
    }
    next();
  } catch (error) {
    serverLogger.error(`Error checking completion order access: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ success: false, message: 'Błąd serwera podczas weryfikacji dostępu' });
  }
};

/**
 * Dla list zleceń: użytkownik bez uprawnień rozszerzonych widzi wyłącznie własne zlecenia
 */
export const restrictCompletionListScope = (req: Request, _res: Response, next: NextFunction): void => {
  if (!hasPrivilegedCompletionAccess(req.user?.permissions as RolePermissions | undefined)) {
    delete req.query.all;
    req.query.assignedTo = String(req.userId);
  }
  next();
};

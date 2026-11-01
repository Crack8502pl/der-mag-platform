// src/middleware/PermissionMiddleware.ts
// Middleware do walidacji granularnych uprawnień

import { Request, Response, NextFunction } from 'express';
import { RolePermissions } from '../entities/Role';
import { EffectivePermissionsService } from '../modules/function-groups/services/EffectivePermissionsService';

/**
 * Middleware do sprawdzania granularnych uprawnień
 * @param module - moduł systemu (np. 'contracts', 'subsystems')
 * @param action - akcja do wykonania (np. 'read', 'create', 'update')
 */
export const requirePermission = (module: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      // Uprawnienia efektywne: rola + aktywne funkcje
      const effective = await EffectivePermissionsService.forRequest(req);

      if (!effective) {
        res.status(401).json({
          success: false,
          message: 'Użytkownik lub rola nie istnieje'
        });
        return;
      }

      const permissions = effective.permissions;

      // Sprawdź czy użytkownik ma pełny dostęp (admin)
      if (permissions.all === true) {
        next();
        return;
      }

      // Sprawdź granularne uprawnienie dla modułu
      const modulePermissions = permissions[module];
      
      if (!modulePermissions) {
        res.status(403).json({
          success: false,
          message: 'Brak uprawnień do tego modułu',
          required: `${module}.${action}`
        });
        return;
      }

      // Sprawdź konkretną akcję
      if (typeof modulePermissions === 'object' && modulePermissions[action] !== true) {
        res.status(403).json({
          success: false,
          message: 'Brak uprawnień do wykonania tej operacji',
          required: `${module}.${action}`
        });
        return;
      }

      // Użytkownik ma wymagane uprawnienie
      next();
    } catch (error) {
      console.error('Błąd middleware uprawnień:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas sprawdzania uprawnień'
      });
    }
  };
};

/**
 * Middleware sprawdzający jedno z wielu uprawnień (OR)
 * @param checks - tablica par [moduł, akcja]
 */
export const requireAnyPermission = (...checks: [string, string][]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const effective = await EffectivePermissionsService.forRequest(req);

      if (!effective) {
        res.status(401).json({
          success: false,
          message: 'Użytkownik lub rola nie istnieje'
        });
        return;
      }

      const permissions = effective.permissions;

      // Admin ma zawsze dostęp
      if (permissions.all === true) {
        next();
        return;
      }

      // Sprawdź czy użytkownik ma którekolwiek z wymaganych uprawnień
      let hasPermission = false;

      for (const [module, action] of checks) {
        const modulePermissions = permissions[module];
        if (modulePermissions && typeof modulePermissions === 'object' && modulePermissions[action] === true) {
          hasPermission = true;
          break;
        }
      }

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Brak uprawnień do wykonania tej operacji',
          required: checks.map(([m, a]) => `${m}.${a}`)
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Błąd middleware uprawnień:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas sprawdzania uprawnień'
      });
    }
  };
};

/**
 * Helper do sprawdzania uprawnień programowo (bez middleware)
 */
export const checkPermission = (permissions: RolePermissions, module: string, action: string): boolean => {
  if (permissions.all === true) {
    return true;
  }

  const modulePermissions = permissions[module];
  if (!modulePermissions) {
    return false;
  }

  if (typeof modulePermissions === 'object' && modulePermissions[action] === true) {
    return true;
  }

  return false;
};

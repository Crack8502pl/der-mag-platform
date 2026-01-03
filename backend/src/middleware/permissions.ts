// src/middleware/permissions.ts
// Middleware do sprawdzania granularnych uprawnień

import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { RolePermissions } from '../entities/Role';
import { TaskType } from '../entities/TaskType';
import { Task } from '../entities/Task';
import { TaskAssignment } from '../entities/TaskAssignment';

/**
 * Sprawdź czy użytkownik ma uprawnienie do modułu i akcji
 */
export const checkPermission = (module: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.userId },
        relations: ['role']
      });

      if (!user || !user.role) {
        res.status(403).json({
          success: false,
          message: 'Brak przypisanej roli'
        });
        return;
      }

      const permissions = user.role.permissions as RolePermissions;

      // Admin ma wszystko
      if (permissions.all === true) {
        return next();
      }

      // Sprawdź uprawnienia do modułu
      const modulePermissions = permissions[module as keyof RolePermissions];
      
      if (!modulePermissions || typeof modulePermissions !== 'object') {
        res.status(403).json({
          success: false,
          message: `Brak dostępu do modułu: ${module}`,
          code: 'MODULE_ACCESS_DENIED'
        });
        return;
      }

      // Sprawdź konkretną akcję
      const hasPermission = (modulePermissions as any)[action] === true;

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: `Brak uprawnień do akcji: ${action} w module: ${module}`,
          code: 'ACTION_NOT_PERMITTED',
          requiredPermission: `${module}.${action}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Błąd sprawdzania uprawnień:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas sprawdzania uprawnień'
      });
    }
  };
};

/**
 * Sprawdź czy użytkownik ma dostęp do dowolnej z podanych akcji w module
 */
export const checkAnyPermission = (module: string, actions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: req.userId },
        relations: ['role']
      });

      if (!user || !user.role) {
        res.status(403).json({
          success: false,
          message: 'Brak przypisanej roli'
        });
        return;
      }

      const permissions = user.role.permissions as RolePermissions;

      // Admin ma wszystko
      if (permissions.all === true) {
        return next();
      }

      // Sprawdź uprawnienia do modułu
      const modulePermissions = permissions[module as keyof RolePermissions];
      
      if (!modulePermissions || typeof modulePermissions !== 'object') {
        res.status(403).json({
          success: false,
          message: `Brak dostępu do modułu: ${module}`,
          code: 'MODULE_ACCESS_DENIED'
        });
        return;
      }

      // Sprawdź czy użytkownik ma jakąkolwiek z wymaganych akcji
      const hasAnyPermission = actions.some(action => 
        (modulePermissions as any)[action] === true
      );

      if (!hasAnyPermission) {
        res.status(403).json({
          success: false,
          message: `Brak uprawnień do modułu: ${module}`,
          code: 'NO_REQUIRED_PERMISSIONS',
          requiredPermissions: actions.map(a => `${module}.${a}`)
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Błąd sprawdzania uprawnień:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas sprawdzania uprawnień'
      });
    }
  };
};

/**
 * Middleware dla warunkowych uprawnień Coordinator (tylko zadania SERWIS)
 * Używane przy tworzeniu zadań
 */
export const validateCoordinatorTaskType = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      return next();
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.userId },
      relations: ['role']
    });

    // Jeśli nie jest koordynatorem, przejdź dalej
    if (!user || !user.role || user.role.name !== 'coordinator') {
      return next();
    }

    // Koordynator - sprawdź typ zadania
    const { taskTypeId } = req.body;
    
    if (!taskTypeId) {
      res.status(400).json({
        success: false,
        message: 'Brak wymaganego pola: taskTypeId'
      });
      return;
    }

    const taskTypeRepository = AppDataSource.getRepository(TaskType);
    const taskType = await taskTypeRepository.findOne({
      where: { id: taskTypeId, active: true }
    });

    if (!taskType) {
      res.status(404).json({
        success: false,
        message: 'Typ zadania nie znaleziony'
      });
      return;
    }

    if (taskType.code !== 'SERWIS') {
      res.status(403).json({
        success: false,
        message: 'Koordynator może tworzyć tylko zadania serwisowe',
        code: 'COORDINATOR_SERVICE_ONLY',
        allowedTypes: ['SERWIS'],
        attemptedType: taskType.code
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Błąd walidacji uprawnień koordynatora:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera'
    });
  }
};

/**
 * Middleware dla warunkowych uprawnień Worker (tylko własne zadania)
 * Używane przy edycji zadań
 */
export const validateWorkerOwnTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      return next();
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.userId },
      relations: ['role']
    });

    // Jeśli nie jest pracownikiem, przejdź dalej
    if (!user || !user.role || user.role.name !== 'worker') {
      return next();
    }

    // Worker - sprawdź czy zadanie jest przypisane do niego
    const { taskNumber } = req.params;

    if (!taskNumber) {
      res.status(400).json({
        success: false,
        message: 'Brak numeru zadania'
      });
      return;
    }

    const taskRepository = AppDataSource.getRepository(Task);
    const assignmentRepository = AppDataSource.getRepository(TaskAssignment);

    const task = await taskRepository.findOne({
      where: { taskNumber, deletedAt: null as any }
    });

    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Zadanie nie znalezione'
      });
      return;
    }

    const assignment = await assignmentRepository.findOne({
      where: {
        taskId: task.id,
        userId: user.id
      }
    });

    if (!assignment) {
      res.status(403).json({
        success: false,
        message: 'Możesz edytować tylko zadania, które są do Ciebie przypisane',
        code: 'WORKER_OWN_TASKS_ONLY'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Błąd walidacji uprawnień pracownika:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera'
    });
  }
};

/**
 * Sprawdź czy użytkownik jest adminem
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'Brak autoryzacji'
      });
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.userId },
      relations: ['role']
    });

    if (!user || !user.role) {
      res.status(403).json({
        success: false,
        message: 'Brak przypisanej roli'
      });
      return;
    }

    const permissions = user.role.permissions as RolePermissions;

    if (permissions.all !== true) {
      res.status(403).json({
        success: false,
        message: 'Wymagane uprawnienia administratora',
        code: 'ADMIN_REQUIRED'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Błąd sprawdzania uprawnień admina:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera'
    });
  }
};

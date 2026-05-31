import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate as classValidate, ValidationError } from 'class-validator';
import { serverLogger } from '../utils/logger';

type ClassConstructor<T> = new (...args: any[]) => T;

type ValidateOptions = {
  forbidNonWhitelisted?: boolean;
};

const formatErrors = (errors: ValidationError[]) =>
  errors.map(error => ({
    field: error.property,
    constraints: Object.values(error.constraints || {}),
  }));

export const validate = <T extends object>(
  DtoClass: ClassConstructor<T>,
  options: ValidateOptions = {}
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const instance = plainToInstance(DtoClass, req.body);

    const errors: ValidationError[] = await classValidate(instance, {
      whitelist: true,
      forbidNonWhitelisted: options.forbidNonWhitelisted ?? true,
      stopAtFirstError: false,
      validationError: { target: false },
    });

    if (errors.length > 0) {
      const formattedErrors = formatErrors(errors);

      serverLogger.warn('[VALIDATE] Błąd walidacji danych wejściowych', {
        path: req.path,
        method: req.method,
        errors: formattedErrors,
      });

      res.status(400).json({
        success: false,
        message: 'Nieprawidłowe dane wejściowe',
        errors: formattedErrors,
      });
      return;
    }

    req.body = instance;
    next();
  };
};

export const validateQuery = <T extends object>(DtoClass: ClassConstructor<T>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const instance = plainToInstance(DtoClass, req.query);

    const errors: ValidationError[] = await classValidate(instance, {
      whitelist: true,
      forbidNonWhitelisted: false,
      stopAtFirstError: false,
      validationError: { target: false },
    });

    if (errors.length > 0) {
      const formattedErrors = formatErrors(errors);

      serverLogger.warn('[VALIDATE] Błąd walidacji query params', {
        path: req.path,
        method: req.method,
        errors: formattedErrors,
      });

      res.status(400).json({
        success: false,
        message: 'Nieprawidłowe parametry zapytania',
        errors: formattedErrors,
      });
      return;
    }

    req.query = instance as Request['query'];
    next();
  };
};

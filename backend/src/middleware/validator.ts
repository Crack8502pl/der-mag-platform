// src/middleware/validator.ts
// Middleware walidacji danych wejściowych

import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Middleware walidacji DTO
 */
export const validateDto = (dtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dtoInstance = plainToClass(dtoClass, req.body);
      const errors: ValidationError[] = await validate(dtoInstance);

      if (errors.length > 0) {
        const formattedErrors = errors.map(error => ({
          field: error.property,
          constraints: error.constraints
        }));

        res.status(400).json({
          success: false,
          message: 'Błąd walidacji danych',
          errors: formattedErrors
        });
        return;
      }

      // Zamień body na zwalidowany obiekt DTO
      req.body = dtoInstance;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas walidacji'
      });
    }
  };
};

/**
 * Walidacja parametrów zapytania
 */
export const validateQuery = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query);

    if (error) {
      res.status(400).json({
        success: false,
        message: 'Nieprawidłowe parametry zapytania',
        details: error.details
      });
      return;
    }

    next();
  };
};

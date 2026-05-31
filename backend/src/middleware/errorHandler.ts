// src/middleware/errorHandler.ts
// OWASP A05/A08: Sanityzacja odpowiedzi błędów — nie ujawniaj szczegółów implementacji

import { Request, Response, NextFunction } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { serverLogger } from '../utils/logger';
import { AppError } from '../utils/AppError';

// Re-export AppError for backward compatibility
export { AppError };

interface ExtendedError extends Error {
  statusCode?: number;
  code?: string;
  detail?: string;
  isOperational?: boolean;
}

/**
 * Mapuje błędy TypeORM/PostgreSQL na bezpieczne komunikaty dla klienta.
 * NIE ujawnia szczegółów SQL atakującym.
 */
function sanitizeTypeOrmError(err: Error): { statusCode: number; message: string } {
  if (err instanceof QueryFailedError) {
    const pgCode = (err as any).code as string | undefined;

    // PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
    switch (pgCode) {
      case '23505': // unique_violation
        return { statusCode: 409, message: 'Zasób już istnieje' };
      case '23503': // foreign_key_violation
        return { statusCode: 409, message: 'Nie można wykonać operacji — powiązane dane istnieją' };
      case '23502': // not_null_violation
        return { statusCode: 400, message: 'Brakujące wymagane dane' };
      case '22P02': // invalid_text_representation
        return { statusCode: 400, message: 'Nieprawidłowy format danych' };
      default:
        return { statusCode: 500, message: 'Błąd operacji na bazie danych' };
    }
  }

  if (err instanceof EntityNotFoundError) {
    return { statusCode: 404, message: 'Nie znaleziono zasobu' };
  }

  return { statusCode: 500, message: 'Wewnętrzny błąd serwera' };
}

/**
 * Centralny error handler Express.
 * MUSI być ostatnim middleware (4 argumenty).
 *
 * W produkcji: sanityzuje błędy — brak stack traces, brak szczegółów SQL
 * W development: zwraca pełne szczegóły dla debugowania
 */
export const errorHandler = (
  err: ExtendedError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Zawsze loguj pełny błąd po stronie serwera
  serverLogger.error('[ERROR_HANDLER]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode: err.statusCode,
    pgCode: (err as any).code,
  });

  // TypeORM / PostgreSQL errors — always sanitize regardless of environment
  if (err instanceof QueryFailedError || err instanceof EntityNotFoundError) {
    const { statusCode, message } = sanitizeTypeOrmError(err);
    res.status(statusCode).json({
      success: false,
      message,
      // NIGDY nie wysyłaj: err.message (zawiera SQL), err.query, err.detail
    });
    return;
  }

  // Mapuj znane typy błędów na bezpieczne komunikaty
  let statusCode = err.statusCode || 500;
  let message = 'Wewnętrzny błąd serwera';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Błąd walidacji danych';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Brak autoryzacji';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Nieprawidłowy token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token wygasł';
  }

  const isClientError = statusCode >= 400 && statusCode < 500;
  // Evaluate dynamically so tests can change NODE_ENV per test
  const production = process.env.NODE_ENV === 'production';

  if (production) {
    res.status(statusCode).json({
      success: false,
      // Dla błędów klienta (4xx) wysyłaj komunikat jeśli błąd jest operacyjny
      // Dla błędów serwera (5xx) — generyczny komunikat
      message: isClientError
        ? (err.isOperational ? message : 'Nieprawidłowe żądanie')
        : 'Wewnętrzny błąd serwera',
      // Brak: stack, err.detail, err.code, query details
    });
  } else {
    // Development/test: pełne szczegóły dla debugowania
    res.status(statusCode).json({
      success: false,
      message,
      stack: err.stack,
      error: err.message,
      code: (err as any).code,
    });
  }
};

/**
 * Handler dla nieznalezionych tras (404).
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    message: `Nie znaleziono zasobu: ${req.method} ${req.path}`,
  });
};

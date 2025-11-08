// src/middleware/errorHandler.ts
// Middleware obsługi błędów

import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Globalny handler błędów
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
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

  // Logowanie błędu w środowisku deweloperskim
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Błąd:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err.message 
    })
  });
};

/**
 * Handler dla nieznalezionych tras
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    message: `Nie znaleziono trasy: ${req.originalUrl}`
  });
};

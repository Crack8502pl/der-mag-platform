// backend/src/utils/AppError.ts
// OWASP A05/A08: Klasa błędu aplikacji — odróżnia błędy operacyjne od nieoczekiwanych

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Gotowe klasy dla typowych błędów
export class NotFoundError extends AppError {
  constructor(resource = 'Zasób') {
    super(`${resource} nie został znaleziony`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Brak autoryzacji') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Brak uprawnień') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Nieprawidłowe dane wejściowe') {
    super(message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Zasób już istnieje') {
    super(message, 409);
  }
}

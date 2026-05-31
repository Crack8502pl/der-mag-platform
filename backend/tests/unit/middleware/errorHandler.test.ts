// tests/unit/middleware/errorHandler.test.ts
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { AppError, errorHandler, notFoundHandler } from '../../../src/middleware/errorHandler';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  getResponseData,
} from '../../mocks/request.mock';

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AppError', () => {
  it('ustawia statusCode i isOperational=true', () => {
    const err = new AppError('Nie znaleziono', 404);
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
  });

  it('jest instancją Error', () => {
    const err = new AppError('Błąd', 500);
    expect(err).toBeInstanceOf(Error);
  });

  it('ustawia message', () => {
    const err = new AppError('Moja wiadomość', 400);
    expect(err.message).toBe('Moja wiadomość');
  });

  it('ma stack trace', () => {
    const err = new AppError('Stack test', 500);
    expect(err.stack).toBeDefined();
  });
});

describe('errorHandler', () => {
  const OLD_ENV = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = OLD_ENV;
    jest.clearAllMocks();
  });

  it('AppError → używa statusCode i message z błędu', () => {
    process.env.NODE_ENV = 'development';
    const req = createMockRequest({ body: {} }) as any;
    const res = createMockResponse() as any;
    const next = createMockNext();
    const err = new AppError('Zasób nie znaleziony', 404);

    errorHandler(err, req, res, next);

    const { status, body } = getResponseData(res);
    expect(status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Zasób nie znaleziony');
  });

  it('ValidationError → 400 z domyślnym komunikatem', () => {
    const req = createMockRequest({}) as any;
    const res = createMockResponse() as any;
    const next = createMockNext();
    const err = Object.assign(new Error('validation failed'), { name: 'ValidationError' });

    errorHandler(err, req, res, next);

    const { status, body } = getResponseData(res);
    expect(status).toBe(400);
    expect(body.message).toBe('Błąd walidacji danych');
  });

  it('UnauthorizedError → 401', () => {
    const req = createMockRequest({}) as any;
    const res = createMockResponse() as any;
    const next = createMockNext();
    const err = Object.assign(new Error('unauthorized'), { name: 'UnauthorizedError' });

    errorHandler(err, req, res, next);

    const { status, body } = getResponseData(res);
    expect(status).toBe(401);
    expect(body.message).toBe('Brak autoryzacji');
  });

  it('JsonWebTokenError → 401', () => {
    const req = createMockRequest({}) as any;
    const res = createMockResponse() as any;
    const next = createMockNext();
    const err = Object.assign(new Error('jwt error'), { name: 'JsonWebTokenError' });

    errorHandler(err, req, res, next);

    const { status, body } = getResponseData(res);
    expect(status).toBe(401);
    expect(body.message).toBe('Nieprawidłowy token');
  });

  it('TokenExpiredError → 401', () => {
    const req = createMockRequest({}) as any;
    const res = createMockResponse() as any;
    const next = createMockNext();
    const err = Object.assign(new Error('token expired'), { name: 'TokenExpiredError' });

    errorHandler(err, req, res, next);

    const { status, body } = getResponseData(res);
    expect(status).toBe(401);
    expect(body.message).toBe('Token wygasł');
  });

  it('generyczny Error → 500 z domyślnym komunikatem', () => {
    const req = createMockRequest({}) as any;
    const res = createMockResponse() as any;
    const next = createMockNext();
    const err = new Error('coś poszło nie tak');

    errorHandler(err, req, res, next);

    const { status, body } = getResponseData(res);
    expect(status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Wewnętrzny błąd serwera');
  });

  it('środowisko development → zawiera stack i error w odpowiedzi', () => {
    process.env.NODE_ENV = 'development';
    const req = createMockRequest({}) as any;
    const res = createMockResponse() as any;
    const next = createMockNext();
    const err = new Error('dev error');

    errorHandler(err, req, res, next);

    const { body } = getResponseData(res);
    expect(body.stack).toBeDefined();
    expect(body.error).toBe('dev error');
  });

  it('środowisko production → nie zawiera stack w odpowiedzi', () => {
    process.env.NODE_ENV = 'production';
    const req = createMockRequest({}) as any;
    const res = createMockResponse() as any;
    const next = createMockNext();
    const err = new Error('prod error');

    errorHandler(err, req, res, next);

    const { body } = getResponseData(res);
    expect(body.stack).toBeUndefined();
    expect(body.error).toBeUndefined();
  });

  // TypeORM / PostgreSQL error tests
  describe('TypeORM errors', () => {
    it('QueryFailedError z kodem 23505 → 409 + "Zasób już istnieje"', () => {
      const req = createMockRequest({}) as any;
      const res = createMockResponse() as any;
      const next = createMockNext();
      const driverError = Object.assign(new Error('unique violation'), { code: '23505' });
      const err = new QueryFailedError('SELECT 1', [], driverError);

      errorHandler(err, req, res, next);

      const { status, body } = getResponseData(res);
      expect(status).toBe(409);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Zasób już istnieje');
    });

    it('QueryFailedError z kodem 23503 → 409 (foreign key violation)', () => {
      const req = createMockRequest({}) as any;
      const res = createMockResponse() as any;
      const next = createMockNext();
      const driverError = Object.assign(new Error('foreign key violation'), { code: '23503' });
      const err = new QueryFailedError('SELECT 1', [], driverError);

      errorHandler(err, req, res, next);

      const { status, body } = getResponseData(res);
      expect(status).toBe(409);
      expect(body.success).toBe(false);
    });

    it('QueryFailedError z kodem 23502 → 400 (not null violation)', () => {
      const req = createMockRequest({}) as any;
      const res = createMockResponse() as any;
      const next = createMockNext();
      const driverError = Object.assign(new Error('not null violation'), { code: '23502' });
      const err = new QueryFailedError('SELECT 1', [], driverError);

      errorHandler(err, req, res, next);

      const { status, body } = getResponseData(res);
      expect(status).toBe(400);
      expect(body.message).toBe('Brakujące wymagane dane');
    });

    it('QueryFailedError z nieznanym kodem → 500 + generyczny komunikat', () => {
      const req = createMockRequest({}) as any;
      const res = createMockResponse() as any;
      const next = createMockNext();
      const driverError = Object.assign(new Error('unknown error'), { code: '99999' });
      const err = new QueryFailedError('SELECT 1', [], driverError);

      errorHandler(err, req, res, next);

      const { status, body } = getResponseData(res);
      expect(status).toBe(500);
      expect(body.message).toBe('Błąd operacji na bazie danych');
    });

    it('QueryFailedError NIE ujawnia szczegółów SQL (message, query)', () => {
      const req = createMockRequest({}) as any;
      const res = createMockResponse() as any;
      const next = createMockNext();
      const driverError = Object.assign(new Error('unique violation'), { code: '23505' });
      const err = new QueryFailedError('SELECT * FROM users WHERE password = "secret"', [], driverError);

      errorHandler(err, req, res, next);

      const { body } = getResponseData(res);
      expect(JSON.stringify(body)).not.toContain('SELECT');
      expect(JSON.stringify(body)).not.toContain('secret');
      expect(body.stack).toBeUndefined();
    });

    it('EntityNotFoundError → 404 + "Nie znaleziono zasobu"', () => {
      const req = createMockRequest({}) as any;
      const res = createMockResponse() as any;
      const next = createMockNext();
      const err = new EntityNotFoundError('User', { id: 1 });

      errorHandler(err, req, res, next);

      const { status, body } = getResponseData(res);
      expect(status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Nie znaleziono zasobu');
    });
  });

  // Production sanitization tests
  describe('produkcja — sanityzacja odpowiedzi', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('AppError(msg, 400) w produkcji → nie zawiera stack trace', () => {
      const req = createMockRequest({}) as any;
      const res = createMockResponse() as any;
      const next = createMockNext();
      const err = new AppError('Nieprawidłowe dane', 400);

      errorHandler(err, req, res, next);

      const { status, body } = getResponseData(res);
      expect(status).toBe(400);
      expect(body.stack).toBeUndefined();
      expect(body.error).toBeUndefined();
    });

    it('AppError(msg, 500) w produkcji → generyczny komunikat "Wewnętrzny błąd serwera"', () => {
      const req = createMockRequest({}) as any;
      const res = createMockResponse() as any;
      const next = createMockNext();
      const err = new AppError('Szczegóły implementacji', 500);

      errorHandler(err, req, res, next);

      const { status, body } = getResponseData(res);
      expect(status).toBe(500);
      expect(body.message).toBe('Wewnętrzny błąd serwera');
      expect(body.stack).toBeUndefined();
    });

    it('AppError operacyjny 4xx → wysyła message do klienta', () => {
      const req = createMockRequest({}) as any;
      const res = createMockResponse() as any;
      const next = createMockNext();
      const err = new AppError('Zasób nie znaleziony', 404, true);

      errorHandler(err, req, res, next);

      const { status, body } = getResponseData(res);
      expect(status).toBe(404);
      expect(body.message).toBe('Zasób nie znaleziony');
    });

    it('TypeORM QueryFailedError w produkcji → brak szczegółów SQL', () => {
      const req = createMockRequest({}) as any;
      const res = createMockResponse() as any;
      const next = createMockNext();
      const driverError = Object.assign(new Error('unique violation'), {
        code: '23505',
        detail: 'Key (email)=(test@test.com) already exists.',
      });
      const err = new QueryFailedError('INSERT INTO users...', [], driverError);

      errorHandler(err, req, res, next);

      const { body } = getResponseData(res);
      expect(JSON.stringify(body)).not.toContain('INSERT');
      expect(JSON.stringify(body)).not.toContain('test@test.com');
      expect(body.stack).toBeUndefined();
    });
  });
});

describe('notFoundHandler', () => {
  it('zwraca 404 z informacją o metodzie i ścieżce', () => {
    const req = createMockRequest({}) as any;
    req.method = 'GET';
    req.path = '/api/nieistniejaca-trasa';
    const res = createMockResponse() as any;
    const next = createMockNext();

    notFoundHandler(req, res, next);

    const { status, body } = getResponseData(res);
    expect(status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toContain('GET');
    expect(body.message).toContain('/api/nieistniejaca-trasa');
  });

  it('zwraca success: false', () => {
    const req = createMockRequest({}) as any;
    req.method = 'POST';
    req.path = '/unknown';
    const res = createMockResponse() as any;
    const next = createMockNext();

    notFoundHandler(req, res, next);

    const { body } = getResponseData(res);
    expect(body.success).toBe(false);
  });
});

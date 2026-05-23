// tests/unit/middleware/errorHandler.test.ts
import { AppError, errorHandler, notFoundHandler } from '../../../src/middleware/errorHandler';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  getResponseData,
} from '../../mocks/request.mock';

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
});

describe('notFoundHandler', () => {
  it('zwraca 404 z informacją o ścieżce', () => {
    const req = createMockRequest({}) as any;
    req.originalUrl = '/api/nieistniejaca-trasa';
    const res = createMockResponse() as any;
    const next = createMockNext();

    notFoundHandler(req, res, next);

    const { status, body } = getResponseData(res);
    expect(status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toContain('/api/nieistniejaca-trasa');
  });

  it('zwraca success: false', () => {
    const req = createMockRequest({}) as any;
    req.originalUrl = '/unknown';
    const res = createMockResponse() as any;
    const next = createMockNext();

    notFoundHandler(req, res, next);

    const { body } = getResponseData(res);
    expect(body.success).toBe(false);
  });
});

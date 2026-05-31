import { Request, Response } from 'express';
import { IsNotEmpty, IsString } from 'class-validator';
import { validate, validateQuery } from '../../../src/middleware/validate';
import { createMockNext, createMockRequest, createMockResponse } from '../../mocks/request.mock';

jest.mock('../../../src/utils/logger', () => ({
  serverLogger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

class TestBodyDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

class TestQueryDto {
  @IsString()
  @IsNotEmpty()
  q: string;
}

describe('validate middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('przepuszcza request z poprawnymi danymi', async () => {
    const req = createMockRequest({ body: { username: 'user', password: 'secret123' } }) as Request;
    (req as any).path = '/auth/login';
    req.method = 'POST';
    const res = createMockResponse() as Response;
    const next = createMockNext();

    await validate(TestBodyDto)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).toEqual({ username: 'user', password: 'secret123' });
  });

  it('odrzuca (400) request z brakującym wymaganym polem', async () => {
    const req = createMockRequest({ body: { username: 'user' } }) as Request;
    (req as any).path = '/auth/login';
    req.method = 'POST';
    const res = createMockResponse() as Response;
    const next = createMockNext();

    await validate(TestBodyDto)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('odrzuca (400) request z nieprawidłowym typem danych', async () => {
    const req = createMockRequest({ body: { username: 123, password: 'secret123' } }) as Request;
    (req as any).path = '/auth/login';
    req.method = 'POST';
    const res = createMockResponse() as Response;
    const next = createMockNext();

    await validate(TestBodyDto)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('odrzuca (400) request z nieznanym polem (forbidNonWhitelisted)', async () => {
    const req = createMockRequest({
      body: { username: 'user', password: 'secret123', role: 'admin' },
    }) as Request;
    (req as any).path = '/auth/login';
    req.method = 'POST';
    const res = createMockResponse() as Response;
    const next = createMockNext();

    await validate(TestBodyDto)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('sanityzuje dane — usuwa pola nieznane DTO (whitelist: true)', async () => {
    const req = createMockRequest({
      body: { username: 'user', password: 'secret123', role: 'admin' },
    }) as Request;
    (req as any).path = '/auth/login';
    req.method = 'POST';
    const res = createMockResponse() as Response;
    const next = createMockNext();

    await validate(TestBodyDto, { forbidNonWhitelisted: false })(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ username: 'user', password: 'secret123' });
    expect((req.body as any).role).toBeUndefined();
  });

  it('validateQuery działa dla query params', async () => {
    const req = createMockRequest({ query: { q: 'fraza', extra: '1' } }) as Request;
    (req as any).path = '/search';
    req.method = 'GET';
    const res = createMockResponse() as Response;
    const next = createMockNext();

    await validateQuery(TestQueryDto)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query).toEqual({ q: 'fraza' });
  });
});

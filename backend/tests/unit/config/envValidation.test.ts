import { validateEnv } from '../../../src/config/envValidation';

describe('validateEnv()', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ── Development: poprawna konfiguracja ──────────────────────────────────
  it('nie rzuca błędu przy poprawnej konfiguracji development', () => {
    expect(() => validateEnv()).not.toThrow();
  });

  it('nie rzuca błędu gdy DISABLE_CSP=true w development', () => {
    process.env.DISABLE_CSP = 'true';
    expect(() => validateEnv()).not.toThrow();
  });

  it('nie rzuca błędu gdy ENABLE_DEBUG_ENDPOINTS=true w development', () => {
    process.env.ENABLE_DEBUG_ENDPOINTS = 'true';
    expect(() => validateEnv()).not.toThrow();
  });

  // ── JWT Secrets ──────────────────────────────────────────────────────────
  it('rzuca błąd gdy JWT_ACCESS_SECRET nie jest ustawiony', () => {
    delete process.env.JWT_ACCESS_SECRET;
    expect(() => validateEnv()).toThrow('Krytyczne błędy konfiguracji środowiska');
  });

  it('rzuca błąd gdy JWT_REFRESH_SECRET nie jest ustawiony', () => {
    delete process.env.JWT_REFRESH_SECRET;
    expect(() => validateEnv()).toThrow('Krytyczne błędy konfiguracji środowiska');
  });

  it('rzuca błąd gdy JWT_ACCESS_SECRET jest za krótki (< 32 znaki)', () => {
    process.env.JWT_ACCESS_SECRET = 'zbyt-krotki';
    expect(() => validateEnv()).toThrow('Krytyczne błędy konfiguracji środowiska');
  });

  it('rzuca błąd gdy JWT_REFRESH_SECRET jest za krótki (< 32 znaki)', () => {
    process.env.JWT_REFRESH_SECRET = 'zbyt-krotki';
    expect(() => validateEnv()).toThrow('Krytyczne błędy konfiguracji środowiska');
  });

  it('rzuca błąd gdy oba JWT secrets są identyczne', () => {
    const sameSecret = 'a'.repeat(32);
    process.env.JWT_ACCESS_SECRET = sameSecret;
    process.env.JWT_REFRESH_SECRET = sameSecret;
    expect(() => validateEnv()).toThrow('muszą być różne');
  });

  it('rzuca błąd gdy JWT_ACCESS_EXPIRY ma nieprawidłowy format', () => {
    process.env.JWT_ACCESS_EXPIRY = 'abc';
    expect(() => validateEnv()).toThrow('JWT_ACCESS_EXPIRY ma nieprawidłowy format');
  });

  it('rzuca błąd gdy JWT_REFRESH_EXPIRY ma nieprawidłowy format', () => {
    process.env.JWT_REFRESH_EXPIRY = '';
    expect(() => validateEnv()).toThrow('JWT_REFRESH_EXPIRY ma nieprawidłowy format');
  });

  it('rzuca błąd gdy JWT_REFRESH_EXPIRY jest krótsze lub równe JWT_ACCESS_EXPIRY', () => {
    process.env.JWT_ACCESS_EXPIRY = '1h';
    process.env.JWT_REFRESH_EXPIRY = '30m';
    expect(() => validateEnv()).toThrow('JWT_REFRESH_EXPIRY musi być dłuższe niż JWT_ACCESS_EXPIRY');
  });

  // ── Produkcja: blokady bezpieczeństwa ────────────────────────────────────
  describe('środowisko produkcyjne', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ORIGIN = 'https://example.com';
      process.env.DB_HOST = 'db.example.com';
    });

    it('nie rzuca błędu przy poprawnej konfiguracji produkcyjnej', () => {
      expect(() => validateEnv()).not.toThrow();
    });

    it('rzuca błąd gdy DISABLE_CSP=true w produkcji (OWASP A05)', () => {
      process.env.DISABLE_CSP = 'true';
      expect(() => validateEnv()).toThrow('DISABLE_CSP=true jest ZABRONIONE');
    });

    it('rzuca błąd gdy ENABLE_DEBUG_ENDPOINTS=true w produkcji (OWASP A05)', () => {
      process.env.ENABLE_DEBUG_ENDPOINTS = 'true';
      expect(() => validateEnv()).toThrow('ENABLE_DEBUG_ENDPOINTS=true jest ZABRONIONE');
    });

    it('rzuca błąd gdy brak CORS_ORIGIN w produkcji', () => {
      delete process.env.CORS_ORIGIN;
      expect(() => validateEnv()).toThrow('CORS_ORIGIN musi być jawnie ustawiony');
    });

    it('rzuca błąd gdy brak DATABASE_URL i DB_HOST w produkcji', () => {
      delete process.env.DB_HOST;
      delete process.env.DATABASE_URL;
      expect(() => validateEnv()).toThrow('Brak konfiguracji bazy danych');
    });

    it('akceptuje DATABASE_URL zamiast DB_HOST w produkcji', () => {
      delete process.env.DB_HOST;
      process.env.DATABASE_URL = 'postgresql://user:pass@db:5432/mydb';
      expect(() => validateEnv()).not.toThrow();
    });

    it('komunikat błędu zawiera liczbę błędów', () => {
      process.env.DISABLE_CSP = 'true';
      process.env.ENABLE_DEBUG_ENDPOINTS = 'true';
      expect(() => validateEnv()).toThrow('2 błędów');
    });
  });
});

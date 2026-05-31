import { getJwtConfig, parseExpiryToSeconds } from '../../../src/config/jwtConfig';

describe('jwtConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('parseExpiryToSeconds()', () => {
    it('returns 900 for 15m', () => {
      expect(parseExpiryToSeconds('15m')).toBe(900);
    });

    it('returns 3600 for 1h', () => {
      expect(parseExpiryToSeconds('1h')).toBe(3600);
    });

    it('returns 604800 for 7d', () => {
      expect(parseExpiryToSeconds('7d')).toBe(604800);
    });

    it('returns 30 for 30s', () => {
      expect(parseExpiryToSeconds('30s')).toBe(30);
    });

    it('throws error for invalid value "abc"', () => {
      expect(() => parseExpiryToSeconds('abc')).toThrow('Nieprawidłowy format czasu wygasania tokenu');
    });

    it('throws error for empty value', () => {
      expect(() => parseExpiryToSeconds('')).toThrow('Nieprawidłowy format czasu wygasania tokenu');
    });

    it('throws error for zero value', () => {
      expect(() => parseExpiryToSeconds('0m')).toThrow('Wartość musi być większa od 0');
    });
  });

  describe('getJwtConfig()', () => {
    it('throws when refresh expiry is shorter or equal to access expiry', () => {
      process.env.JWT_ACCESS_EXPIRY = '15m';
      process.env.JWT_REFRESH_EXPIRY = '15m';

      expect(() => getJwtConfig()).toThrow('JWT_REFRESH_EXPIRY (15m) musi być dłuższe niż JWT_ACCESS_EXPIRY (15m)');
    });

    it('returns parsed config for valid env values', () => {
      process.env.JWT_ACCESS_EXPIRY = '10m';
      process.env.JWT_REFRESH_EXPIRY = '10d';

      expect(getJwtConfig()).toEqual({
        accessSecret: 'a'.repeat(32),
        refreshSecret: 'b'.repeat(32),
        accessExpiresIn: '10m',
        refreshExpiresIn: '10d',
        accessExpiresInSeconds: 600,
        refreshExpiresInSeconds: 864000,
      });
    });

    it('throws when JWT_ACCESS_SECRET is missing', () => {
      delete process.env.JWT_ACCESS_SECRET;

      expect(() => getJwtConfig()).toThrow('JWT_ACCESS_SECRET i JWT_REFRESH_SECRET muszą być ustawione');
    });

    it('supports legacy ACCESS_EXPIRES and REFRESH_EXPIRES when new vars are not set', () => {
      delete process.env.JWT_ACCESS_EXPIRY;
      delete process.env.JWT_REFRESH_EXPIRY;
      process.env.ACCESS_EXPIRES = '20m';
      process.env.REFRESH_EXPIRES = '14d';

      const config = getJwtConfig();

      expect(config.accessExpiresIn).toBe('20m');
      expect(config.refreshExpiresIn).toBe('14d');
      expect(config.accessExpiresInSeconds).toBe(1200);
      expect(config.refreshExpiresInSeconds).toBe(1209600);
    });

    it('wraps expiry parse errors from env values', () => {
      process.env.JWT_ACCESS_EXPIRY = 'abc';

      expect(() => getJwtConfig()).toThrow('Błąd konfiguracji JWT: Nieprawidłowy format czasu wygasania tokenu');
    });
  });
});

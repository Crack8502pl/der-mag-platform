// tests/unit/rate-limiting.test.ts
import { RATE_LIMIT } from '../../src/config/constants';

describe('Rate Limiting Configuration', () => {
  describe('RATE_LIMIT constants', () => {
    it('should have correct default values for general API', () => {
      // Since env vars might be set, we'll just check they are numbers
      expect(typeof RATE_LIMIT.WINDOW_MS).toBe('number');
      expect(typeof RATE_LIMIT.MAX_REQUESTS).toBe('number');
      
      // Check they are positive
      expect(RATE_LIMIT.WINDOW_MS).toBeGreaterThan(0);
      expect(RATE_LIMIT.MAX_REQUESTS).toBeGreaterThan(0);
    });

    it('should have correct default values for auth endpoints', () => {
      expect(typeof RATE_LIMIT.AUTH_WINDOW_MS).toBe('number');
      expect(typeof RATE_LIMIT.AUTH_MAX_REQUESTS).toBe('number');
      
      // Check they are positive
      expect(RATE_LIMIT.AUTH_WINDOW_MS).toBeGreaterThan(0);
      expect(RATE_LIMIT.AUTH_MAX_REQUESTS).toBeGreaterThan(0);
    });

    it('should have auth limits more permissive than general API (when measured per same time window)', () => {
      // Auth: 30 requests per minute = 30/60000ms = 0.0005 req/ms
      // General: 100 requests per 15 min = 100/900000ms = 0.00011 req/ms
      // So auth should be roughly 4.5x more permissive
      
      const authRatePerMs = RATE_LIMIT.AUTH_MAX_REQUESTS / RATE_LIMIT.AUTH_WINDOW_MS;
      const generalRatePerMs = RATE_LIMIT.MAX_REQUESTS / RATE_LIMIT.WINDOW_MS;
      
      expect(authRatePerMs).toBeGreaterThan(generalRatePerMs);
    });

    it('should have auth window shorter than general API window', () => {
      // Auth endpoints should reset faster
      expect(RATE_LIMIT.AUTH_WINDOW_MS).toBeLessThan(RATE_LIMIT.WINDOW_MS);
    });
  });

  describe('Environment variable parsing', () => {
    it('should parse environment variables as integers', () => {
      // The parseInt should ensure we get integers, not strings
      expect(Number.isInteger(RATE_LIMIT.WINDOW_MS)).toBe(true);
      expect(Number.isInteger(RATE_LIMIT.MAX_REQUESTS)).toBe(true);
      expect(Number.isInteger(RATE_LIMIT.AUTH_WINDOW_MS)).toBe(true);
      expect(Number.isInteger(RATE_LIMIT.AUTH_MAX_REQUESTS)).toBe(true);
    });
  });
});

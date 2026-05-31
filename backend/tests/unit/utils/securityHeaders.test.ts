// tests/unit/utils/securityHeaders.test.ts
// Tests for security headers audit utility and Express middleware configuration

import express from 'express';
import helmet from 'helmet';
import request from 'supertest';
import {
  auditSecurityHeaders,
  REQUIRED_SECURITY_HEADERS,
  PRODUCTION_ONLY_HEADERS,
} from '../../../src/utils/securityHeaders';

// ── Unit tests: auditSecurityHeaders ──────────────────────────────────────────

describe('auditSecurityHeaders', () => {
  it('returns missing: [] when all required headers are present', () => {
    const headers: Record<string, string> = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=()',
    };

    const result = auditSecurityHeaders(headers);

    expect(result.missing).toEqual([]);
    expect(result.present).toEqual(expect.arrayContaining([...REQUIRED_SECURITY_HEADERS]));
    expect(result.present).toHaveLength(REQUIRED_SECURITY_HEADERS.length);
  });

  it('reports missing headers when some are absent', () => {
    const headers: Record<string, string> = {
      'x-content-type-options': 'nosniff',
      // x-frame-options missing
      // referrer-policy missing
      'permissions-policy': 'camera=()',
    };

    const result = auditSecurityHeaders(headers);

    expect(result.missing).toContain('x-frame-options');
    expect(result.missing).toContain('referrer-policy');
    expect(result.present).toContain('x-content-type-options');
    expect(result.present).toContain('permissions-policy');
  });

  it('reports all headers missing when headers object is empty', () => {
    const result = auditSecurityHeaders({});

    expect(result.missing).toEqual(expect.arrayContaining([...REQUIRED_SECURITY_HEADERS]));
    expect(result.missing).toHaveLength(REQUIRED_SECURITY_HEADERS.length);
    expect(result.present).toEqual([]);
  });

  it('handles headers with array values', () => {
    const headers: Record<string, string | string[] | undefined> = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': ['DENY'],
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=()',
    };

    const result = auditSecurityHeaders(headers);

    expect(result.missing).toEqual([]);
    expect(result.present).toHaveLength(REQUIRED_SECURITY_HEADERS.length);
  });

  it('handles headers with undefined values as missing', () => {
    const headers: Record<string, string | string[] | undefined> = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': undefined,
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=()',
    };

    const result = auditSecurityHeaders(headers);

    expect(result.missing).toContain('x-frame-options');
    expect(result.present).not.toContain('x-frame-options');
  });
});

describe('REQUIRED_SECURITY_HEADERS constant', () => {
  it('contains the expected security headers', () => {
    expect(REQUIRED_SECURITY_HEADERS).toContain('x-content-type-options');
    expect(REQUIRED_SECURITY_HEADERS).toContain('x-frame-options');
    expect(REQUIRED_SECURITY_HEADERS).toContain('referrer-policy');
    expect(REQUIRED_SECURITY_HEADERS).toContain('permissions-policy');
  });
});

describe('PRODUCTION_ONLY_HEADERS constant', () => {
  it('contains strict-transport-security', () => {
    expect(PRODUCTION_ONLY_HEADERS).toContain('strict-transport-security');
  });
});

// ── Integration tests: Express app security headers ───────────────────────────

function createTestApp() {
  const app = express();

  // Apply the same helmet config used in development (non-production) mode
  app.use(helmet({
    hidePoweredBy: true,
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  // Permissions-Policy middleware (same as in app.ts)
  app.use((_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      [
        'camera=()',
        'microphone=()',
        'geolocation=(self)',
        'payment=()',
        'usb=()',
        'fullscreen=(self)',
      ].join(', ')
    );
    next();
  });

  app.get('/test', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

describe('Express security headers middleware', () => {
  const app = createTestApp();

  it('does not expose X-Powered-By header', async () => {
    const response = await request(app).get('/test');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('sets X-Content-Type-Options: nosniff', async () => {
    const response = await request(app).get('/test');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options: DENY', async () => {
    const response = await request(app).get('/test');
    expect(response.headers['x-frame-options']).toBe('DENY');
  });

  it('sets Permissions-Policy containing camera=()', async () => {
    const response = await request(app).get('/test');
    expect(response.headers['permissions-policy']).toBeDefined();
    expect(response.headers['permissions-policy']).toContain('camera=()');
  });

  it('sets Permissions-Policy containing microphone=()', async () => {
    const response = await request(app).get('/test');
    expect(response.headers['permissions-policy']).toContain('microphone=()');
  });

  it('sets Referrer-Policy: strict-origin-when-cross-origin', async () => {
    const response = await request(app).get('/test');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('passes auditSecurityHeaders with no missing headers', async () => {
    const response = await request(app).get('/test');
    const { missing } = auditSecurityHeaders(response.headers as Record<string, string>);
    expect(missing).toEqual([]);
  });
});

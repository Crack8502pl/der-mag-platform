// src/middleware/csrf.ts
// CSRF protection middleware using Double Submit Cookie pattern

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

/**
 * Generate a secure random CSRF token
 */
export const generateCsrfToken = (): string => {
  return randomBytes(32).toString('hex');
};

/**
 * CSRF validation middleware
 * Compares the CSRF token from request header with the one in cookie
 * Uses Double Submit Cookie pattern for CSRF protection
 */
export const validateCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  const csrfTokenFromHeader = req.headers['x-csrf-token'] as string;
  const csrfTokenFromCookie = req.cookies['csrf-token'];

  // If no CSRF token in cookie, reject
  if (!csrfTokenFromCookie) {
    res.status(403).json({
      success: false,
      message: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING'
    });
    return;
  }

  // If no CSRF token in header, reject
  if (!csrfTokenFromHeader) {
    res.status(403).json({
      success: false,
      message: 'CSRF token required in X-CSRF-Token header',
      code: 'CSRF_TOKEN_REQUIRED'
    });
    return;
  }

  // Compare tokens (constant-time comparison to prevent timing attacks)
  if (!constantTimeCompare(csrfTokenFromHeader, csrfTokenFromCookie)) {
    res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
    return;
  }

  next();
};

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

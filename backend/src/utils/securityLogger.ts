import { serverLogger } from './logger';

export type SecurityEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_LOGOUT'
  | 'AUTH_TOKEN_REFRESH'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_BRUTE_FORCE_DETECTED'
  | 'ACCESS_DENIED'
  | 'ACCESS_UNAUTHORIZED'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'WEBHOOK_SIGNATURE_VALID'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SQL_INJECTION_ATTEMPT'
  | 'XSS_ATTEMPT'
  | 'CSRF_TOKEN_INVALID'
  | 'PASSWORD_CHANGE'
  | 'USER_CREATED'
  | 'USER_DELETED'
  | 'PERMISSION_CHANGE'
  | 'SUSPICIOUS_ACTIVITY';

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string | number;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  requestId?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export function logSecurityEvent(event: SecurityEvent): void {
  const enrichedEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  const criticalEvents: SecurityEventType[] = [
    'AUTH_BRUTE_FORCE_DETECTED',
    'SQL_INJECTION_ATTEMPT',
    'XSS_ATTEMPT',
    'SUSPICIOUS_ACTIVITY',
  ];

  const warnEvents: SecurityEventType[] = [
    'AUTH_LOGIN_FAILURE',
    'AUTH_TOKEN_INVALID',
    'WEBHOOK_SIGNATURE_INVALID',
    'RATE_LIMIT_EXCEEDED',
    'CSRF_TOKEN_INVALID',
    'ACCESS_DENIED',
    'ACCESS_UNAUTHORIZED',
  ];

  if (criticalEvents.includes(event.type)) {
    serverLogger.error(`[SECURITY] ${event.type}`, enrichedEvent);
  } else if (warnEvents.includes(event.type)) {
    serverLogger.warn(`[SECURITY] ${event.type}`, enrichedEvent);
  } else {
    serverLogger.info(`[SECURITY] ${event.type}`, enrichedEvent);
  }
}

export function sanitizeRequestForLog(req: {
  ip?: string;
  path?: string;
  method?: string;
  headers?: Record<string, unknown>;
  body?: Record<string, unknown>;
}): Record<string, unknown> {
  const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'cookie', 'creditcard', 'cvv'];

  const sanitizeValue = (key: string, value: unknown) =>
    sensitiveFields.some(field => key.toLowerCase().includes(field)) ? '[REDACTED]' : value;

  const sanitizedBody = req.body
    ? Object.fromEntries(
        Object.entries(req.body).map(([key, value]) => [key, sanitizeValue(key, value)])
      )
    : undefined;

  return {
    ip: req.ip,
    path: req.path,
    method: req.method,
    body: sanitizedBody,
  };
}

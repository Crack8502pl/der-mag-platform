// backend/src/utils/securityHeaders.ts
// Utility do audytu nagłówków bezpieczeństwa — używane w testach i diagnostyce

export const REQUIRED_SECURITY_HEADERS = [
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
] as const;

export const PRODUCTION_ONLY_HEADERS = [
  'strict-transport-security',
] as const;

export type RequiredHeader = typeof REQUIRED_SECURITY_HEADERS[number];

/**
 * Sprawdza czy odpowiedź zawiera wymagane nagłówki bezpieczeństwa.
 * Używane w testach integracyjnych.
 */
export function auditSecurityHeaders(headers: Record<string, string | string[] | undefined>): {
  missing: string[];
  present: string[];
} {
  const missing: string[] = [];
  const present: string[] = [];

  for (const header of REQUIRED_SECURITY_HEADERS) {
    if (headers[header]) {
      present.push(header);
    } else {
      missing.push(header);
    }
  }

  return { missing, present };
}

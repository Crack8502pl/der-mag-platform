// src/modules/automation/masking.ts
// Maskowanie danych wrażliwych przed zapisem do dziennika uruchomień (hasła, tokeny, sekrety).

const SENSITIVE_KEY = /(password|passwd|haslo|hasło|token|secret|authorization|cookie|api[-_]?key|credential|otp|cvv)/i;
const INLINE_SECRET = /\b(bearer)\s+[A-Za-z0-9._~+/=-]{8,}|\b(password|passwd|haslo|hasło|token|secret|api[-_]?key)\s*[=:]\s*\S+/gi;

export const MASK = '[ZAMASKOWANE]';

function maskString(value: string): string {
  return value.replace(INLINE_SECRET, (_match, bearer: string | undefined, key: string | undefined) =>
    bearer ? `${bearer} ${MASK}` : `${key}=${MASK}`);
}

export function maskSensitive<T>(value: T, depth = 0): T {
  if (depth > 10) return MASK as unknown as T;
  if (typeof value === 'string') return maskString(value) as unknown as T;
  if (Array.isArray(value)) return value.map(item => maskSensitive(item, depth + 1)) as unknown as T;
  if (value instanceof Date) return value;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) && item !== null && item !== undefined ? MASK : maskSensitive(item, depth + 1),
    ])) as T;
  }
  return value;
}

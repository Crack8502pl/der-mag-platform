// src/config/envValidation.ts
// Walidacja krytycznych zmiennych środowiskowych przy starcie aplikacji

import { serverLogger } from '../utils/logger';
import { parseExpiryToSeconds } from './jwtConfig';

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Waliduje krytyczne zmienne środowiskowe.
 * W przypadku błędów krytycznych rzuca wyjątek i blokuje start serwera.
 *
 * OWASP A05 - Security Misconfiguration:
 * - Blokuje DISABLE_CSP=true w produkcji
 * - Blokuje ENABLE_DEBUG_ENDPOINTS=true w produkcji
 * - Wymusza silne JWT secrets (min. 32 znaki, muszą być różne)
 * - Wymusza CORS_ORIGIN w produkcji
 */
export function validateEnv(): void {
  const result = checkEnvVariables();

  if (result.warnings.length > 0) {
    result.warnings.forEach(w => serverLogger.warn(`[ENV] ⚠️  ${w}`));
  }

  if (!result.valid) {
    result.errors.forEach(e => serverLogger.error(`[ENV] ❌ ${e}`));
    throw new Error(
      `Krytyczne błędy konfiguracji środowiska (${result.errors.length} błędów).\n` +
      `Sprawdź zmienne środowiskowe i uruchom ponownie.\n` +
      `Błędy:\n${result.errors.map(e => `  - ${e}`).join('\n')}`
    );
  }

  serverLogger.info('[ENV] ✅ Walidacja zmiennych środowiskowych zakończona pomyślnie');
}

function checkEnvVariables(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // ── KRYTYCZNE: JWT Secrets ───────────────────────────────────────────────
  if (!process.env.JWT_ACCESS_SECRET) {
    errors.push('JWT_ACCESS_SECRET nie jest ustawiony');
  } else if (process.env.JWT_ACCESS_SECRET.length < 32) {
    errors.push('JWT_ACCESS_SECRET jest za krótki (minimum 32 znaki)');
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    errors.push('JWT_REFRESH_SECRET nie jest ustawiony');
  } else if (process.env.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET jest za krótki (minimum 32 znaki)');
  }

  if (
    process.env.JWT_ACCESS_SECRET &&
    process.env.JWT_REFRESH_SECRET &&
    process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET
  ) {
    errors.push('JWT_ACCESS_SECRET i JWT_REFRESH_SECRET muszą być różne');
  }

  const accessExpiry = process.env.JWT_ACCESS_EXPIRY ?? process.env.ACCESS_EXPIRES;
  const refreshExpiry = process.env.JWT_REFRESH_EXPIRY ?? process.env.REFRESH_EXPIRES;

  let accessExpirySeconds: number | null = null;
  let refreshExpirySeconds: number | null = null;

  if (accessExpiry !== undefined) {
    try {
      accessExpirySeconds = parseExpiryToSeconds(accessExpiry);
    } catch {
      errors.push(`JWT_ACCESS_EXPIRY ma nieprawidłowy format: "${accessExpiry}". Użyj: 15m, 1h, 7d`);
    }
  }

  if (refreshExpiry !== undefined) {
    try {
      refreshExpirySeconds = parseExpiryToSeconds(refreshExpiry);
    } catch {
      errors.push(`JWT_REFRESH_EXPIRY ma nieprawidłowy format: "${refreshExpiry}". Użyj: 15m, 1h, 7d`);
    }
  }

  if (
    accessExpirySeconds !== null &&
    refreshExpirySeconds !== null &&
    refreshExpirySeconds <= accessExpirySeconds
  ) {
    errors.push('JWT_REFRESH_EXPIRY musi być dłuższe niż JWT_ACCESS_EXPIRY');
  }

  // ── KRYTYCZNE: Produkcja ─────────────────────────────────────────────────
  if (isProduction) {
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      errors.push('[PRODUKCJA] Brak konfiguracji bazy danych (DATABASE_URL lub DB_HOST)');
    }

    if (!process.env.CORS_ORIGIN) {
      errors.push('[PRODUKCJA] CORS_ORIGIN musi być jawnie ustawiony w środowisku produkcyjnym');
    }

    // Hard block — DISABLE_CSP=true jest niedozwolone w produkcji (OWASP A05)
    if (process.env.DISABLE_CSP === 'true') {
      errors.push(
        '[PRODUKCJA] DISABLE_CSP=true jest ZABRONIONE w środowisku produkcyjnym. ' +
        'Usuń tę zmienną lub ustaw DISABLE_CSP=false.'
      );
    }

    // Hard block — ENABLE_DEBUG_ENDPOINTS=true jest niedozwolone w produkcji (OWASP A05)
    if (process.env.ENABLE_DEBUG_ENDPOINTS === 'true') {
      errors.push(
        '[PRODUKCJA] ENABLE_DEBUG_ENDPOINTS=true jest ZABRONIONE w środowisku produkcyjnym. ' +
        'Usuń tę zmienną lub ustaw ENABLE_DEBUG_ENDPOINTS=false.'
      );
    }

    // Ostrzeżenie — produkcja bez HTTPS
    if (process.env.BASE_URL && !process.env.BASE_URL.startsWith('https://')) {
      warnings.push('[PRODUKCJA] BASE_URL nie zaczyna się od https:// — sprawdź konfigurację TLS');
    }

    // Ostrzeżenie — brak SESSION_SECRET
    if (!process.env.SESSION_SECRET) {
      warnings.push('[PRODUKCJA] SESSION_SECRET nie jest ustawiony');
    }

    if (!process.env.WEBHOOK_SECRET) {
      warnings.push(
        '[PRODUKCJA] WEBHOOK_SECRET nie jest ustawiony — ' +
        'endpointy /api/integrations/webhooks/* nie weryfikują tożsamości nadawcy (OWASP A04)'
      );
    }
  }

  // ── OSTRZEŻENIA: Development / ogólne ────────────────────────────────────
  if (!isProduction) {
    if (!process.env.NODE_ENV) {
      warnings.push('NODE_ENV nie jest ustawiony — przyjmuję tryb development');
    }

    if (process.env.DISABLE_CSP === 'true') {
      warnings.push(
        'DISABLE_CSP=true — Content Security Policy jest wyłączony. ' +
        'Ta flaga jest dozwolona tylko w development.'
      );
    }

    if (process.env.ENABLE_DEBUG_ENDPOINTS === 'true') {
      warnings.push(
        'ENABLE_DEBUG_ENDPOINTS=true — endpointy diagnostyczne /debug/* są aktywne. ' +
        'Upewnij się, że nie wdrażasz tej konfiguracji na produkcję.'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

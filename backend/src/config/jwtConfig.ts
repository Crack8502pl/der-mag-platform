import { serverLogger } from '../utils/logger';

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
  accessExpiresInSeconds: number;
  refreshExpiresInSeconds: number;
}

/**
 * Parsuje string czasu (np. "15m", "7d", "1h") na sekundy.
 * Obsługuje: s (sekundy), m (minuty), h (godziny), d (dni)
 */
export function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    throw new Error(`Nieprawidłowy format czasu wygasania tokenu: "${expiry}". Użyj formatu: 15m, 1h, 7d`);
  }

  const value = parseInt(match[1], 10);
  if (value <= 0) {
    throw new Error(`Nieprawidłowa wartość czasu wygasania tokenu: "${expiry}". Wartość musi być większa od 0`);
  }
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      throw new Error(`Nieznana jednostka czasu: ${unit}`);
  }
}

/**
 * Waliduje i zwraca konfigurację JWT.
 * Rzuca błąd jeśli konfiguracja jest nieprawidłowa.
 */
export function getJwtConfig(): JwtConfig {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  const accessExpiresIn =
    process.env.JWT_ACCESS_EXPIRY !== undefined
      ? process.env.JWT_ACCESS_EXPIRY
      : process.env.ACCESS_EXPIRES !== undefined
        ? process.env.ACCESS_EXPIRES
        : '15m';
  const refreshExpiresIn =
    process.env.JWT_REFRESH_EXPIRY !== undefined
      ? process.env.JWT_REFRESH_EXPIRY
      : process.env.REFRESH_EXPIRES !== undefined
        ? process.env.REFRESH_EXPIRES
        : '7d';

  if (!accessSecret || !refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET i JWT_REFRESH_SECRET muszą być ustawione');
  }

  let accessExpiresInSeconds: number;
  let refreshExpiresInSeconds: number;

  try {
    accessExpiresInSeconds = parseExpiryToSeconds(accessExpiresIn);
    refreshExpiresInSeconds = parseExpiryToSeconds(refreshExpiresIn);
  } catch (err) {
    throw new Error(`Błąd konfiguracji JWT: ${(err as Error).message}`);
  }

  if (refreshExpiresInSeconds <= accessExpiresInSeconds) {
    throw new Error(
      `JWT_REFRESH_EXPIRY (${refreshExpiresIn}) musi być dłuższe niż JWT_ACCESS_EXPIRY (${accessExpiresIn}). ` +
        'OWASP A02: refresh token krótszy niż access token uniemożliwia odświeżenie sesji.'
    );
  }

  serverLogger.info(`[JWT] Access token: ${accessExpiresIn}, Refresh token: ${refreshExpiresIn}`);

  return {
    accessSecret,
    refreshSecret,
    accessExpiresIn,
    refreshExpiresIn,
    accessExpiresInSeconds,
    refreshExpiresInSeconds,
  };
}

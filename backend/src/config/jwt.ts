// src/config/jwt.ts
// Konfiguracja JSON Web Token z obsługą rotacji tokenów

import jwt from 'jsonwebtoken';

// Separate secrets for access and refresh tokens (no fallback - must be set)
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Validate secrets on startup
if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined in environment variables. ' +
    'Generate strong secrets and add them to your .env file.'
  );
}

const ACCESS_EXPIRES = process.env.ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.REFRESH_EXPIRES || '7d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'der-mag-platform';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'der-mag-api';

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  jti?: string; // Token ID for rotation tracking
  iss?: string;
  aud?: string;
}

/**
 * Generate access token with short expiration (15m)
 * @param payload - User payload
 * @param tokenId - Unique token ID (jti) for tracking
 */
export const generateAccessToken = (payload: JWTPayload, tokenId: string): string => {
  return jwt.sign(
    {
      userId: payload.userId,
      username: payload.username,
      role: payload.role
    },
    JWT_ACCESS_SECRET,
    {
      expiresIn: ACCESS_EXPIRES,
      jwtid: tokenId,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    } as jwt.SignOptions
  );
};

/**
 * Generate refresh token with long expiration (7d)
 * @param payload - User payload
 * @param tokenId - Unique token ID (jti) for rotation tracking
 */
export const generateRefreshToken = (payload: JWTPayload, tokenId: string): string => {
  return jwt.sign(
    {
      userId: payload.userId,
      username: payload.username,
      role: payload.role
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_EXPIRES,
      jwtid: tokenId,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    } as jwt.SignOptions
  );
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_ACCESS_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  }) as JWTPayload;
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  }) as JWTPayload;
};

/**
 * Legacy verifyToken for backward compatibility
 * @deprecated Use verifyAccessToken or verifyRefreshToken instead
 */
export const verifyToken = (token: string): JWTPayload => {
  return verifyAccessToken(token);
};

/**
 * Decode token without verification (for reading jti)
 */
export const decodeToken = (token: string): JWTPayload | null => {
  return jwt.decode(token) as JWTPayload | null;
};

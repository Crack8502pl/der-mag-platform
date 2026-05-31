// src/config/jwt.ts
// Konfiguracja JSON Web Token z obsługą rotacji tokenów

import jwt from 'jsonwebtoken';
import { getJwtConfig } from './jwtConfig';

const jwtConfig = getJwtConfig();
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
    jwtConfig.accessSecret,
    {
      expiresIn: jwtConfig.accessExpiresIn,
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
    jwtConfig.refreshSecret,
    {
      expiresIn: jwtConfig.refreshExpiresIn,
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
  return jwt.verify(token, jwtConfig.accessSecret, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  }) as JWTPayload;
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, jwtConfig.refreshSecret, {
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

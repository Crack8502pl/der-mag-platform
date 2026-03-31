// src/services/SseTokenService.ts
// Short-lived, one-time tokens for authenticating SSE connections.
// Tokens are stored in memory and expire after TTL_MS.
// Each token is deleted on first use to prevent replay attacks.

import crypto from 'crypto';

const TTL_MS = 60_000; // tokens valid for 60 seconds
const TOKEN_BYTES = 32; // 256-bit random token – sufficient entropy for a short-lived secret

interface TokenEntry {
  roleId: number;
  expiresAt: number;
}

class SseTokenService {
  private tokens = new Map<string, TokenEntry>();

  /** Create a short-lived SSE token for the given role. */
  create(roleId: number): string {
    this.cleanup();
    const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    this.tokens.set(token, { roleId, expiresAt: Date.now() + TTL_MS });
    return token;
  }

  /**
   * Validate and consume a token.
   * Returns the roleId if valid, null otherwise.
   */
  consume(token: string): number | null {
    const entry = this.tokens.get(token);
    if (!entry) return null;
    this.tokens.delete(token); // one-time use
    if (Date.now() > entry.expiresAt) return null;
    return entry.roleId;
  }

  /** Remove expired tokens (called on each create). */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.tokens) {
      if (now > entry.expiresAt) this.tokens.delete(key);
    }
  }
}

export const sseTokenService = new SseTokenService();

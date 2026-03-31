// src/utils/permissionCodec.ts
// Utility for encoding/decoding permission error codes (frontend)
// Format: ERR-PERM-{base64encodedJSON}

export interface PermissionErrorPayload {
  userId: number;
  username: string;
  roleName: string;
  requestedModule: string;
  requestedAction: string;
  timestamp: number;
}

const PREFIX = 'ERR-PERM-';

/**
 * Encode a permission error payload into a shareable code
 */
export function encodePermissionError(payload: PermissionErrorPayload): string {
  const json = JSON.stringify(payload);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return PREFIX + encoded;
}

/**
 * Decode a permission error code back to its payload
 * Returns null if the code is invalid
 */
export function decodePermissionError(code: string): PermissionErrorPayload | null {
  try {
    if (!code.startsWith(PREFIX)) return null;
    const encoded = code.slice(PREFIX.length);
    const json = decodeURIComponent(escape(atob(encoded)));
    const payload = JSON.parse(json) as PermissionErrorPayload;
    // Basic validation
    if (
      typeof payload.userId !== 'number' ||
      typeof payload.username !== 'string' ||
      typeof payload.roleName !== 'string' ||
      typeof payload.requestedModule !== 'string' ||
      typeof payload.requestedAction !== 'string' ||
      typeof payload.timestamp !== 'number'
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

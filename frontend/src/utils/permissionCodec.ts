// src/utils/permissionCodec.ts
// Utility for encoding/decoding permission error codes (frontend)
// Format: ERR-PERM-{base64encodedJSON}
// The code is Base64-encoded JSON – it is intentionally opaque to end users
// but is NOT a security boundary (treat as a debug/diagnostic payload).

export interface PermissionErrorPayload {
  userId: number;
  username: string;
  roleName: string;
  requestedModule: string;
  requestedAction: string;
  timestamp: number;
}

const PREFIX = 'ERR-PERM-';

/** Encode a Uint8Array to a base64 string (compatible with all modern browsers). */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Decode a base64 string to a Uint8Array. */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encode a permission error payload into a shareable code.
 */
export function encodePermissionError(payload: PermissionErrorPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return PREFIX + uint8ArrayToBase64(bytes);
}

/**
 * Decode a permission error code back to its payload.
 * Returns null if the code is invalid.
 */
export function decodePermissionError(code: string): PermissionErrorPayload | null {
  try {
    if (!code.startsWith(PREFIX)) return null;
    const encoded = code.slice(PREFIX.length);
    const bytes = base64ToUint8Array(encoded);
    const json = new TextDecoder().decode(bytes);
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

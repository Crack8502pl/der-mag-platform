// src/utils/permissionCodec.test.ts
import { encodePermissionError, decodePermissionError } from './permissionCodec';
import type { PermissionErrorPayload } from './permissionCodec';

const samplePayload: PermissionErrorPayload = {
  userId: 42,
  username: 'testuser',
  roleName: 'viewer',
  requestedModule: 'contracts',
  requestedAction: 'delete',
  timestamp: 1700000000000,
};

describe('encodePermissionError', () => {
  it('zwraca string zaczynający się od ERR-PERM-', () => {
    const result = encodePermissionError(samplePayload);
    expect(result).toMatch(/^ERR-PERM-/);
  });

  it('zwraca niepusty string po prefiksie', () => {
    const result = encodePermissionError(samplePayload);
    expect(result.length).toBeGreaterThan('ERR-PERM-'.length);
  });
});

describe('decodePermissionError', () => {
  it('round-trip: decode(encode(payload)) === payload', () => {
    const encoded = encodePermissionError(samplePayload);
    expect(decodePermissionError(encoded)).toEqual(samplePayload);
  });

  it('decodePermissionError("") zwraca null', () => {
    expect(decodePermissionError('')).toBeNull();
  });

  it('zwraca null dla nieprawidłowego stringa', () => {
    expect(decodePermissionError('INVALID')).toBeNull();
  });

  it('zwraca null dla stringa bez prefiksu ERR-PERM-', () => {
    expect(decodePermissionError('abc123')).toBeNull();
  });

  it('zwraca null dla nieprawidłowego base64 po prefiksie', () => {
    expect(decodePermissionError('ERR-PERM-invalididbase64!!!')).toBeNull();
  });

  it('zwraca null dla prawidłowego base64 ale nieprawidłowego JSON', () => {
    // Encode "not valid json" as UTF-8 bytes → base64
    const bytes = new TextEncoder().encode('not valid json');
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    expect(decodePermissionError('ERR-PERM-' + btoa(binary))).toBeNull();
  });

  it('zwraca null gdy brakuje wymaganych pól', () => {
    const partial = { userId: 1, username: 'x' };
    const bytes = new TextEncoder().encode(JSON.stringify(partial));
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    expect(decodePermissionError('ERR-PERM-' + btoa(binary))).toBeNull();
  });

  it('zwraca null gdy userId nie jest liczbą', () => {
    const invalid = {
      userId: 'not-a-number',
      username: 'x',
      roleName: 'r',
      requestedModule: 'm',
      requestedAction: 'a',
      timestamp: 1000,
    };
    const bytes = new TextEncoder().encode(JSON.stringify(invalid));
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    expect(decodePermissionError('ERR-PERM-' + btoa(binary))).toBeNull();
  });

  it('obsługuje wielkie znaki w polu username', () => {
    const payload = { ...samplePayload, username: 'UPPERCASE_USER' };
    const encoded = encodePermissionError(payload);
    const decoded = decodePermissionError(encoded);
    expect(decoded?.username).toBe('UPPERCASE_USER');
  });

  it('zachowuje wszystkie pola po round-trip', () => {
    const payload: PermissionErrorPayload = {
      userId: 999,
      username: 'admin',
      roleName: 'superadmin',
      requestedModule: 'users',
      requestedAction: 'delete',
      timestamp: 9999999999999,
    };
    const decoded = decodePermissionError(encodePermissionError(payload));
    expect(decoded).toEqual(payload);
  });

  it('dekoduje payload z numerycznym userId i stringowym username', () => {
    const payload: PermissionErrorPayload = {
      userId: 123,
      username: 'jan.kowalski',
      roleName: 'user',
      requestedModule: 'tasks',
      requestedAction: 'read',
      timestamp: 1700000000001,
    };

    const decoded = decodePermissionError(encodePermissionError(payload));
    expect(decoded).toEqual(payload);
  });
});

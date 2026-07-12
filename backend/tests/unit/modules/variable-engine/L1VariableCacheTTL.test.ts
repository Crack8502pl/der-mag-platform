/**
 * Unit tests – L1VariableCache TTL support (L-25)
 */

import { L1VariableCache } from '../../../../src/modules/variable-engine/cache/L1VariableCache';

describe('L1VariableCache – TTL support (L-25)', () => {
  // ── Basic set/get without TTL (backward compat) ───────────────────────────────

  it('returns a value when no TTL is configured', () => {
    const cache = new L1VariableCache();
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('returns undefined for a missing key', () => {
    const cache = new L1VariableCache();
    expect(cache.get('missing')).toBeUndefined();
  });

  // ── TTL expiry ────────────────────────────────────────────────────────────────

  it('returns undefined for an expired entry (defaultTtlMs)', () => {
    const cache = new L1VariableCache({ defaultTtlMs: 1 }); // 1ms TTL
    cache.set('key', 'value');
    // Advance time past TTL using fake date
    const realNow = Date.now;
    try {
      Date.now = () => realNow() + 100; // 100ms in the future
      expect(cache.get('key')).toBeUndefined();
    } finally {
      Date.now = realNow;
    }
  });

  it('returns value before TTL expires', () => {
    const cache = new L1VariableCache({ defaultTtlMs: 60_000 }); // 60s TTL
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('setWithTtl overrides TTL for a specific entry', () => {
    const cache = new L1VariableCache({ defaultTtlMs: 60_000 }); // long default TTL
    cache.setWithTtl('key', 'value', 1); // 1ms override TTL
    const realNow = Date.now;
    try {
      Date.now = () => realNow() + 100;
      expect(cache.get('key')).toBeUndefined();
    } finally {
      Date.now = realNow;
    }
  });

  it('setWithTtl(key, value, 0) means no expiry', () => {
    const cache = new L1VariableCache();
    cache.setWithTtl('key', 'value', 0);
    const realNow = Date.now;
    try {
      Date.now = () => realNow() + 1_000_000; // far future
      expect(cache.get('key')).toBe('value');
    } finally {
      Date.now = realNow;
    }
  });

  it('expired entry is removed lazily on get', () => {
    const cache = new L1VariableCache({ defaultTtlMs: 1 });
    cache.set('key', 'value');
    const realNow = Date.now;
    try {
      Date.now = () => realNow() + 100;
      cache.get('key'); // triggers lazy eviction
    } finally {
      Date.now = realNow;
    }
    // After eviction, size decreases (entry was removed)
    expect(cache.size).toBe(0);
  });

  // ── LRU eviction still works with TTL ────────────────────────────────────────

  it('still evicts LRU entries when capacity is exceeded', () => {
    const cache = new L1VariableCache({ maxSize: 2, defaultTtlMs: 60_000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // should evict 'a' (LRU)
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });
});

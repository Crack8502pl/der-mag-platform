/**
 * Unit tests – L1VariableCache
 */

import { L1VariableCache } from '../../../../src/modules/variable-engine/cache/L1VariableCache';

describe('L1VariableCache', () => {
  let cache: L1VariableCache;

  beforeEach(() => {
    cache = new L1VariableCache();
  });

  // ── Basic operations ──────────────────────────────────────────────────────────

  it('returns undefined for a missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('stores and retrieves a string value', () => {
    cache.set('k', 'hello');
    expect(cache.get('k')).toBe('hello');
  });

  it('stores and retrieves a number value', () => {
    cache.set('k', 42);
    expect(cache.get('k')).toBe(42);
  });

  it('stores and retrieves a boolean value', () => {
    cache.set('k', false);
    expect(cache.get('k')).toBe(false);
  });

  it('stores and retrieves a null value', () => {
    cache.set('k', null);
    expect(cache.get('k')).toBeNull();
  });

  it('deletes a key', () => {
    cache.set('k', 'v');
    cache.delete('k');
    expect(cache.get('k')).toBeUndefined();
  });

  it('clear removes all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('reports correct size', () => {
    expect(cache.size).toBe(0);
    cache.set('x', 1);
    expect(cache.size).toBe(1);
  });

  // ── Capacity / eviction ───────────────────────────────────────────────────────

  it('evicts the oldest entry when maxSize is reached', () => {
    const c = new L1VariableCache({ maxSize: 3 });
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    // Inserting 'd' should evict 'a' (oldest).
    c.set('d', 4);
    expect(c.get('a')).toBeUndefined();
    expect(c.get('d')).toBe(4);
    expect(c.size).toBe(3);
  });

  it('does not evict when updating an existing key', () => {
    const c = new L1VariableCache({ maxSize: 2 });
    c.set('a', 1);
    c.set('b', 2);
    // Update 'a' – should not trigger eviction because the key already exists.
    c.set('a', 99);
    expect(c.get('a')).toBe(99);
    expect(c.get('b')).toBe(2);
    expect(c.size).toBe(2);
  });
});

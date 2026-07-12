/**
 * Unit tests – CompositeVariableCache (L-01)
 */

import { L1VariableCache } from '../../../../src/modules/variable-engine/cache/L1VariableCache';
import { CompositeVariableCache } from '../../../../src/modules/variable-engine/cache/CompositeVariableCache';
import { NullL2VariableCache } from '../../../../src/modules/variable-engine/cache/NullL2VariableCache';
import type { IL2VariableCache, VariableValue } from '../../../../src/modules/variable-engine/contracts';

// ─── Mock L2 ─────────────────────────────────────────────────────────────────

function makeL2(store: Map<string, VariableValue> = new Map()): IL2VariableCache {
  return {
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: VariableValue) => { store.set(key, value); }),
    delete: jest.fn(async (key: string) => { store.delete(key); }),
    clear: jest.fn(async () => { store.clear(); }),
  };
}

describe('CompositeVariableCache', () => {
  // ── NullL2 behaviour ──────────────────────────────────────────────────────────

  it('with NullL2: get returns undefined when L1 misses', () => {
    const cache = new CompositeVariableCache(new L1VariableCache(), new NullL2VariableCache());
    expect(cache.get('missing')).toBeUndefined();
  });

  it('with NullL2: set + get round-trips through L1', () => {
    const cache = new CompositeVariableCache(new L1VariableCache(), new NullL2VariableCache());
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('with NullL2: delete removes from L1', () => {
    const cache = new CompositeVariableCache(new L1VariableCache(), new NullL2VariableCache());
    cache.set('key', 'value');
    cache.delete('key');
    expect(cache.get('key')).toBeUndefined();
  });

  it('with NullL2: clear removes all entries', () => {
    const cache = new CompositeVariableCache(new L1VariableCache(), new NullL2VariableCache());
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  // ── L2 write-through ──────────────────────────────────────────────────────────

  it('writes to L2 when set is called', async () => {
    const l2 = makeL2();
    const cache = new CompositeVariableCache(new L1VariableCache(), l2);
    cache.set('key', 'value');
    // Give the async write time to complete
    await new Promise((r) => setTimeout(r, 10));
    expect(l2.set).toHaveBeenCalledWith('key', 'value', undefined);
  });

  it('deletes from L2 when delete is called', async () => {
    const l2 = makeL2();
    const cache = new CompositeVariableCache(new L1VariableCache(), l2);
    cache.delete('key');
    await new Promise((r) => setTimeout(r, 10));
    expect(l2.delete).toHaveBeenCalledWith('key');
  });

  // ── L2 async read-through ─────────────────────────────────────────────────────

  it('getAsync returns value from L2 on L1 miss and populates L1', async () => {
    const l2Store = new Map<string, VariableValue>([['key', 'l2value']]);
    const l2 = makeL2(l2Store);
    const l1 = new L1VariableCache();
    const cache = new CompositeVariableCache(l1, l2);

    const result = await cache.getAsync('key');
    expect(result).toBe('l2value');
    // L1 should now be populated
    expect(l1.get('key')).toBe('l2value');
  });

  it('getAsync returns L1 hit without calling L2', async () => {
    const l2 = makeL2();
    const l1 = new L1VariableCache();
    l1.set('key', 'l1value');
    const cache = new CompositeVariableCache(l1, l2);

    const result = await cache.getAsync('key');
    expect(result).toBe('l1value');
    expect(l2.get).not.toHaveBeenCalled();
  });

  it('getAsync returns undefined when both L1 and L2 miss', async () => {
    const cache = new CompositeVariableCache(new L1VariableCache(), new NullL2VariableCache());
    expect(await cache.getAsync('missing')).toBeUndefined();
  });

  // ── L2 error handling ─────────────────────────────────────────────────────────

  it('getAsync handles L2 errors gracefully (returns undefined)', async () => {
    const l2: IL2VariableCache = {
      get: jest.fn().mockRejectedValue(new Error('L2 down')),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    const cache = new CompositeVariableCache(new L1VariableCache(), l2);
    await expect(cache.getAsync('key')).resolves.toBeUndefined();
  });
});

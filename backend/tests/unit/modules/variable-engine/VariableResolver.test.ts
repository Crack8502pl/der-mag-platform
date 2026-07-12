/**
 * Unit tests – VariableResolver
 */

import { VariableResolver } from '../../../../src/modules/variable-engine/resolver/VariableResolver';
import { L1VariableCache } from '../../../../src/modules/variable-engine/cache/L1VariableCache';
import type {
  IVariableRegistry,
  IVariableProvider,
  VariableContext,
  VariableValue
} from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ctx: VariableContext = { entityId: 1, entityType: 'task' };

function makeRegistry(provider?: IVariableProvider): IVariableRegistry {
  return {
    register: jest.fn(),
    find: jest.fn().mockReturnValue(provider),
    getAll: jest.fn().mockReturnValue(provider ? [provider] : [])
  };
}

function makeProvider(value: VariableValue): IVariableProvider {
  return {
    namespaces: ['camera'],
    resolve: jest.fn().mockResolvedValue(value)
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VariableResolver', () => {
  let cache: L1VariableCache;

  beforeEach(() => {
    cache = new L1VariableCache();
  });

  // ── Basic resolution ──────────────────────────────────────────────────────────

  it('returns undefined when no provider matches', async () => {
    const registry = makeRegistry(undefined);
    const resolver = new VariableResolver(registry, cache);
    const result = await resolver.resolve('unknown.metric', ctx);
    expect(result).toBeUndefined();
  });

  it('calls the matching provider and returns its value', async () => {
    const provider = makeProvider(42);
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, cache);
    const result = await resolver.resolve('camera.total', ctx);
    expect(result).toBe(42);
  });

  // ── Caching ───────────────────────────────────────────────────────────────────

  it('caches the resolved value on first call', async () => {
    const provider = makeProvider('cached');
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, cache);

    await resolver.resolve('camera.total', ctx);
    await resolver.resolve('camera.total', ctx);

    // Provider should only be called once; second call should come from cache.
    expect(provider.resolve).toHaveBeenCalledTimes(1);
  });

  it('does not cache undefined values', async () => {
    const provider = makeProvider(undefined);
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, cache);

    await resolver.resolve('camera.total', ctx);
    await resolver.resolve('camera.total', ctx);

    // Provider should be called both times since undefined is not cached.
    expect(provider.resolve).toHaveBeenCalledTimes(2);
  });

  it('bypasses cache when bypassCache option is set', async () => {
    const provider = makeProvider(7);
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, cache, { bypassCache: true });

    await resolver.resolve('camera.total', ctx);
    await resolver.resolve('camera.total', ctx);

    expect(provider.resolve).toHaveBeenCalledTimes(2);
  });

  // ── Soft-fail ─────────────────────────────────────────────────────────────────

  it('returns undefined and does not throw when provider throws', async () => {
    const provider: IVariableProvider = {
      namespaces: ['camera'],
      resolve: jest.fn().mockRejectedValue(new Error('DB error'))
    };
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, cache);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await resolver.resolve('camera.total', ctx);
    consoleSpy.mockRestore();

    expect(result).toBeUndefined();
  });

  // ── Cache key isolation ────────────────────────────────────────────────────────

  it('uses separate cache entries for different entity contexts', async () => {
    const provider: IVariableProvider = {
      namespaces: ['camera'],
      resolve: jest.fn()
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(20)
    };
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, cache);

    const ctx1: VariableContext = { entityId: 1, entityType: 'task' };
    const ctx2: VariableContext = { entityId: 2, entityType: 'task' };

    const r1 = await resolver.resolve('camera.total', ctx1);
    const r2 = await resolver.resolve('camera.total', ctx2);

    expect(r1).toBe(10);
    expect(r2).toBe(20);
    expect(provider.resolve).toHaveBeenCalledTimes(2);
  });
});

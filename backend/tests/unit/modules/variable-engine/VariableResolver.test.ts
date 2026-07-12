/**
 * Unit tests – VariableResolver
 */

import { VariableResolver } from '../../../../src/modules/variable-engine/resolver/VariableResolver';
import { L1VariableCache } from '../../../../src/modules/variable-engine/cache/L1VariableCache';
import { NullVariableLogger, VariableEngineLogger } from '../../../../src/modules/variable-engine/logger';
import type {
  IVariableRegistry,
  IVariableProvider,
  IVariableLogger,
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

function makeMockLogger(): jest.Mocked<IVariableLogger> {
  return {
    error: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
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

    await expect(resolver.resolve('camera.total', ctx)).resolves.toBeUndefined();
  });

  // ── Structured logging on provider error ──────────────────────────────────────

  it('calls logger.error with structured meta when provider throws', async () => {
    const logger = makeMockLogger();
    const provider: IVariableProvider = {
      namespaces: ['camera'],
      resolve: jest.fn().mockRejectedValue(new Error('DB error'))
    };
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, cache, { logger });

    await resolver.resolve('camera.total', ctx);

    expect(logger.error).toHaveBeenCalledTimes(1);
    const [, meta] = logger.error.mock.calls[0] as [string, Record<string, unknown>];
    expect(meta.expression).toBe('camera.total');
    expect(meta.errorMessage).toBe('DB error');
    expect(meta.errorName).toBe('Error');
  });

  it('does not call any console.error when using NullVariableLogger and provider throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const provider: IVariableProvider = {
      namespaces: ['camera'],
      resolve: jest.fn().mockRejectedValue(new Error('boom'))
    };
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, cache, { logger: new NullVariableLogger() });

    await resolver.resolve('camera.total', ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('uses NullVariableLogger by default (no console output on error)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const provider: IVariableProvider = {
      namespaces: ['camera'],
      resolve: jest.fn().mockRejectedValue(new Error('silent'))
    };
    const registry = makeRegistry(provider);
    // No logger supplied → default NullVariableLogger
    const resolver = new VariableResolver(registry, cache);

    await resolver.resolve('camera.total', ctx);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('calls logger.trace on cache hit when trace is enabled', async () => {
    const logger = makeMockLogger();
    const provider = makeProvider('val');
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, cache, { logger });

    // First call populates cache
    await resolver.resolve('camera.total', ctx);
    // Second call should hit cache and emit trace
    await resolver.resolve('camera.total', ctx);

    expect(logger.trace).toHaveBeenCalledWith('Cache hit', { expression: 'camera.total' });
  });

  it('calls logger.trace when no provider found', async () => {
    const logger = makeMockLogger();
    const registry = makeRegistry(undefined);
    const resolver = new VariableResolver(registry, cache, { logger });

    await resolver.resolve('unknown.metric', ctx);

    expect(logger.trace).toHaveBeenCalledWith('No provider found', { expression: 'unknown.metric' });
  });

  it('includes durationMs in the provider-resolved trace log (PR-9 profiling)', async () => {
    const logger = makeMockLogger();
    const provider = makeProvider(100);
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, cache, { logger });

    await resolver.resolve('camera.total', ctx);

    const providerResolvedCall = logger.trace.mock.calls.find(
      ([msg]) => msg === 'Provider resolved'
    );
    expect(providerResolvedCall).toBeDefined();
    const meta = providerResolvedCall![1] as Record<string, unknown>;
    expect(typeof meta.durationMs).toBe('number');
    expect(meta.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('VariableEngineLogger does not emit console.error output when provider throws (stack trace suppressed)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = new VariableEngineLogger(); // default: includeStackTrace=false
    const provider: IVariableProvider = {
      namespaces: ['camera'],
      resolve: jest.fn().mockRejectedValue(new Error('oops'))
    };
    const registry = makeRegistry(provider);
    const resolver = new VariableResolver(registry, cache, { logger });

    await resolver.resolve('camera.total', ctx);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logEntry = JSON.parse(consoleSpy.mock.calls[0][0] as string) as Record<string, unknown>;
    // Stack trace must NOT be present in production output
    expect(logEntry.stack).toBeUndefined();
    expect(logEntry.errorMessage).toBe('oops');

    consoleSpy.mockRestore();
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


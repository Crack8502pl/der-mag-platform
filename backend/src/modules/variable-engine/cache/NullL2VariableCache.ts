/**
 * Variable Engine – NullL2VariableCache (L-01)
 *
 * A no-op implementation of `IL2VariableCache` used when no external L2
 * cache (Redis, Memcached, etc.) is configured.
 *
 * Every read returns `undefined` (miss) and every write is silently ignored.
 * This allows the cache wiring to use `CompositeVariableCache` uniformly
 * regardless of whether a real L2 implementation is injected.
 *
 * ## DI usage
 *
 * Inject `NullL2VariableCache` as the default when building without Redis:
 * ```ts
 * const { engine } = new VariableEngineFactory(providers, {
 *   cache: { l2: new NullL2VariableCache() }
 * }).create();
 * ```
 */

import type { IL2VariableCache, VariableValue } from '../contracts';

export class NullL2VariableCache implements IL2VariableCache {
  async get(_key: string): Promise<VariableValue | undefined> {
    return undefined;
  }

  async set(_key: string, _value: VariableValue, _ttlMs?: number): Promise<void> {
    // no-op
  }

  async delete(_key: string): Promise<void> {
    // no-op
  }

  async clear(): Promise<void> {
    // no-op
  }
}

/**
 * Variable Engine – L1 in-process cache
 *
 * A simple `Map`-backed implementation of `IVariableCache`.
 *
 * Characteristics:
 * - O(1) get/set/delete.
 * - No TTL in PR-1 scope (TTL / L2 Redis cache is a PR-7+ concern).
 * - Optional capacity limit with LRU-style eviction to prevent unbounded
 *   memory growth in long-running processes.
 */

import type { IVariableCache, VariableValue } from '../contracts';

export interface L1CacheOptions {
  /**
   * Maximum number of entries to keep.
   * When the limit is reached the oldest entry is removed (FIFO approximation).
   * Defaults to `1000`.
   */
  readonly maxSize?: number;
}

const DEFAULT_MAX_SIZE = 1000;

export class L1VariableCache implements IVariableCache {
  /**
   * We use a `Map` because insertion order is guaranteed by the JS spec,
   * which makes FIFO eviction straightforward.
   */
  private readonly store = new Map<string, VariableValue>();
  private readonly maxSize: number;

  constructor(options: L1CacheOptions = {}) {
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  }

  get(key: string): VariableValue | undefined {
    return this.store.get(key);
  }

  set(key: string, value: VariableValue): void {
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      // Remove the oldest entry (first key in insertion order).
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) {
        this.store.delete(firstKey);
      }
    }
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  /** Diagnostic: current number of cached entries. */
  get size(): number {
    return this.store.size;
  }
}

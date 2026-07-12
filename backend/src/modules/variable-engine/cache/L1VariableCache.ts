/**
 * Variable Engine – L1 in-process cache
 *
 * A `Map`-backed implementation of `IVariableCache` with **LRU eviction**.
 *
 * Characteristics:
 * - O(1) get/set/delete (Map guarantees insertion-order iteration).
 * - LRU eviction: the *least recently used* entry is dropped when the
 *   capacity limit is reached.  On every `get` the accessed key is
 *   re-inserted at the tail of the Map so that the Map's natural iteration
 *   order reflects recency (head = LRU, tail = MRU).
 * - No TTL (TTL / L2 Redis cache is a future concern).
 *
 * PR-9: upgraded from FIFO to LRU to improve cache hit rates when the same
 * "hot" variables are resolved across many consecutive template evaluations.
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
    const value = this.store.get(key);
    if (value === undefined) {
      return undefined;
    }
    // LRU: re-insert at the tail so the Map's head stays the least recently used.
    this.store.delete(key);
    this.store.set(key, value);
    return value;
  }

  set(key: string, value: VariableValue): void {
    if (this.store.has(key)) {
      // Re-insert at tail to update recency position.
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      // Evict the least recently used entry (head = first key in Map order).
      const lruKey = this.store.keys().next().value;
      if (lruKey !== undefined) {
        this.store.delete(lruKey);
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

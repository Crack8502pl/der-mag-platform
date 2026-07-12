/**
 * Variable Engine – L1 in-process cache (post-PR-10: L-25 TTL support)
 *
 * A `Map`-backed implementation of `IVariableCache` with **LRU eviction**
 * and optional **TTL (time-to-live)** per entry.
 *
 * Characteristics:
 * - O(1) get/set/delete (Map guarantees insertion-order iteration).
 * - LRU eviction: the *least recently used* entry is dropped when the
 *   capacity limit is reached.  On every `get` the accessed key is
 *   re-inserted at the tail of the Map so that the Map's natural iteration
 *   order reflects recency (head = LRU, tail = MRU).
 * - **TTL (L-25):** entries may carry an optional expiry timestamp.  A `get`
 *   for an expired entry returns `undefined` and removes the entry lazily.
 *   TTL is specified as `defaultTtlMs` in constructor options and can be
 *   overridden per-entry via `setWithTtl()`.
 *   Set `defaultTtlMs: 0` (default) to disable TTL (entries never expire).
 *
 * PR-9: upgraded from FIFO to LRU to improve cache hit rates.
 * Post-PR-10 (L-25): added TTL per entry.
 */

import type { IVariableCache, VariableValue } from '../contracts';

export interface L1CacheOptions {
  /**
   * Maximum number of entries to keep.
   * When the limit is reached the LRU entry is evicted.
   * Defaults to `1000`.
   */
  readonly maxSize?: number;

  /**
   * Default time-to-live for cache entries, in milliseconds (L-25).
   * When `0` or omitted, entries do not expire.
   *
   * @default 0 (no TTL)
   */
  readonly defaultTtlMs?: number;
}

const DEFAULT_MAX_SIZE = 1000;

/** Internal entry that pairs a cached value with its optional expiry. */
interface CacheEntry {
  readonly value: VariableValue;
  /** Absolute expiry timestamp (ms since epoch), or `0` for no expiry. */
  readonly expiresAt: number;
}

export class L1VariableCache implements IVariableCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;

  constructor(options: L1CacheOptions = {}) {
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
    this.defaultTtlMs = options.defaultTtlMs ?? 0;
  }

  get(key: string): VariableValue | undefined {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return undefined;
    }

    // TTL check: lazily evict expired entries.
    if (entry.expiresAt !== 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    // LRU: re-insert at the tail so the Map's head stays the least recently used.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: VariableValue): void {
    this.setWithTtl(key, value, this.defaultTtlMs);
  }

  /**
   * Store a value with an explicit TTL override (L-25).
   *
   * @param key   – Cache key.
   * @param value – Value to store.
   * @param ttlMs – TTL in milliseconds; `0` means no expiry.
   */
  setWithTtl(key: string, value: VariableValue, ttlMs: number): void {
    const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : 0;
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      // Evict the least recently used entry (head = first key in Map order).
      const lruKey = this.store.keys().next().value;
      if (lruKey !== undefined) {
        this.store.delete(lruKey);
      }
    }
    this.store.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  /** Diagnostic: current number of cached entries (may include not-yet-accessed expired entries – expired entries are lazily evicted on `get()`). */
  get size(): number {
    return this.store.size;
  }
}

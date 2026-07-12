/**
 * Variable Engine – CompositeVariableCache (L-01)
 *
 * A two-tier read-through / write-through cache that combines:
 * - **L1** – `L1VariableCache` (in-process, synchronous, LRU+TTL).
 * - **L2** – any `IL2VariableCache` implementation (e.g. Redis; async).
 *
 * ## Read strategy (read-through)
 * 1. Check L1 → cache hit: return value.
 * 2. Check L2 → cache hit: populate L1, return value.
 * 3. Both miss: return `undefined`.
 *
 * ## Write strategy (write-through)
 * Writes are applied to L1 immediately and to L2 asynchronously (fire-and-
 * forget with error logging).  L2 write failures never propagate to callers.
 *
 * ## TTL
 * L1 TTL is controlled by `L1CacheOptions.defaultTtlMs`.
 * L2 TTL is passed through to `IL2VariableCache.set()` as `l2TtlMs`.
 *
 * ## DI usage
 * ```ts
 * import { CompositeVariableCache, L1VariableCache, NullL2VariableCache } from './cache';
 *
 * const cache = new CompositeVariableCache(
 *   new L1VariableCache({ maxSize: 500, defaultTtlMs: 30_000 }),
 *   new RedisL2Cache(redisClient),  // or NullL2VariableCache for no L2
 *   { l2TtlMs: 300_000 }
 * );
 * ```
 */

import type { IVariableCache, IL2VariableCache, IVariableLogger, VariableValue } from '../contracts';
import { NullVariableLogger } from '../logger';

export interface CompositeVariableCacheOptions {
  /**
   * TTL for L2 entries in milliseconds.  `0` means no TTL (default).
   * @default 0
   */
  readonly l2TtlMs?: number;

  /** Logger for L2 write failures. Defaults to no-op. */
  readonly logger?: IVariableLogger;
}

export class CompositeVariableCache implements IVariableCache {
  private readonly l1: IVariableCache;
  private readonly l2: IL2VariableCache;
  private readonly l2TtlMs: number;
  private readonly logger: IVariableLogger;

  constructor(
    l1: IVariableCache,
    l2: IL2VariableCache,
    options: CompositeVariableCacheOptions = {}
  ) {
    this.l1 = l1;
    this.l2 = l2;
    this.l2TtlMs = options.l2TtlMs ?? 0;
    this.logger = options.logger ?? new NullVariableLogger();
  }

  get(key: string): VariableValue | undefined {
    // ── 1. L1 hit ─────────────────────────────────────────────────────────────
    const l1Value = this.l1.get(key);
    if (l1Value !== undefined) {
      return l1Value;
    }

    // ── 2. L2 hit (async; not awaitable from sync IVariableCache.get) ─────────
    // Because IVariableCache.get is synchronous we cannot await L2 here.
    // L2 read-through is best-effort: trigger async L2 lookup and populate L1
    // in the background.  Callers that need guaranteed L2 hit should use
    // `getAsync()`.
    this.l2.get(key).then((l2Value) => {
      if (l2Value !== undefined) {
        this.l1.set(key, l2Value);
      }
    }).catch((err: unknown) => {
      this.logger.warn('L2 cache read failed', {
        key,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    });

    return undefined;
  }

  /**
   * Async variant that awaits the L2 read-through (preferred when the caller
   * can handle async, e.g. in a specialised middleware).
   */
  async getAsync(key: string): Promise<VariableValue | undefined> {
    const l1Value = this.l1.get(key);
    if (l1Value !== undefined) {
      return l1Value;
    }

    try {
      const l2Value = await this.l2.get(key);
      if (l2Value !== undefined) {
        this.l1.set(key, l2Value);
        return l2Value;
      }
    } catch (err) {
      this.logger.warn('L2 cache read failed', {
        key,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }

    return undefined;
  }

  set(key: string, value: VariableValue): void {
    // Write to L1 synchronously.
    this.l1.set(key, value);

    // Write to L2 asynchronously (fire-and-forget).
    this.l2.set(key, value, this.l2TtlMs > 0 ? this.l2TtlMs : undefined).catch(
      (err: unknown) => {
        this.logger.warn('L2 cache write failed', {
          key,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    );
  }

  delete(key: string): void {
    this.l1.delete(key);
    this.l2.delete(key).catch((err: unknown) => {
      this.logger.warn('L2 cache delete failed', {
        key,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    });
  }

  clear(): void {
    this.l1.clear();
    this.l2.clear().catch((err: unknown) => {
      this.logger.warn('L2 cache clear failed', {
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

/**
 * Variable Engine – DataFetchDeduplicator (PR-9 scope)
 *
 * Eliminates N+1 data-service calls that arise when a single template
 * evaluation resolves multiple fields from the same namespace for the
 * same entity.
 *
 * ## Problem
 *
 * `VariableEvaluator` deduplicates *expressions* via `Promise.all`, but two
 * different expressions (e.g. `camera.total` and `camera.storage.tb`) have
 * different cache keys even though they both require the same underlying
 * `getCameraData(entityId)` call.  Without deduplication the data service
 * is invoked once per field – an N+1 pattern.
 *
 * ## Solution
 *
 * `DataFetchDeduplicator` keeps a Map of in-flight Promises keyed by an
 * entity key.  If a second concurrent call arrives for the same key while
 * the first fetch is still pending, it receives the *same* Promise.  Once
 * the Promise settles the entry is removed so the next independent request
 * starts a fresh fetch (no stale-data risk).
 *
 * ## Usage (in a provider)
 *
 * ```ts
 * private readonly deduplicator = new DataFetchDeduplicator<CameraData>();
 *
 * async resolve(expression: string, context: VariableContext) {
 *   const entityKey = `${entityId}:${entityType}`;
 *   const data = await this.deduplicator.fetch(entityKey, () =>
 *     this.cameraService.getCameraData(entityId, entityType)
 *   );
 *   // …
 * }
 * ```
 */

export class DataFetchDeduplicator<T> {
  private readonly pending = new Map<string, Promise<T | undefined>>();

  /**
   * Return the in-flight Promise for `key` if one exists, otherwise invoke
   * `fetcher()` and store its Promise until it settles.
   *
   * @param key     – Unique key identifying the fetch (e.g. `"42:task"`).
   * @param fetcher – Factory that performs the actual async data-service call.
   */
  fetch(key: string, fetcher: () => Promise<T | undefined>): Promise<T | undefined> {
    const existing = this.pending.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const promise = fetcher().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  /** Number of currently in-flight fetches (useful for diagnostics/tests). */
  get pendingCount(): number {
    return this.pending.size;
  }
}

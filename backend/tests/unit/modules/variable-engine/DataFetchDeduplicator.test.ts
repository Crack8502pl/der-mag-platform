/**
 * Unit tests – DataFetchDeduplicator (PR-9)
 */

import { DataFetchDeduplicator } from '../../../../src/modules/variable-engine/providers/DataFetchDeduplicator';

describe('DataFetchDeduplicator', () => {
  // ── Basic fetch ───────────────────────────────────────────────────────────────

  it('calls the fetcher and returns its result', async () => {
    const dedup = new DataFetchDeduplicator<number>();
    const fetcher = jest.fn().mockResolvedValue(42);
    const result = await dedup.fetch('key1', fetcher);
    expect(result).toBe(42);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('returns undefined when fetcher resolves to undefined', async () => {
    const dedup = new DataFetchDeduplicator<number>();
    const fetcher = jest.fn().mockResolvedValue(undefined);
    const result = await dedup.fetch('key1', fetcher);
    expect(result).toBeUndefined();
  });

  // ── N+1 deduplication ─────────────────────────────────────────────────────────

  it('deduplicates concurrent calls with the same key – fetcher called once', async () => {
    const dedup = new DataFetchDeduplicator<string>();
    let resolvePromise!: (v: string) => void;
    const pendingPromise = new Promise<string>((res) => { resolvePromise = res; });
    const fetcher = jest.fn().mockReturnValue(pendingPromise);

    // Kick off two concurrent fetches for the same key.
    const p1 = dedup.fetch('entity:1', fetcher);
    const p2 = dedup.fetch('entity:1', fetcher);

    // Fetcher must only be called once.
    expect(fetcher).toHaveBeenCalledTimes(1);

    resolvePromise('value');
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe('value');
    expect(r2).toBe('value');
  });

  it('does NOT deduplicate calls with different keys', async () => {
    const dedup = new DataFetchDeduplicator<number>();
    const fetcher = jest.fn()
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(20);

    const [r1, r2] = await Promise.all([
      dedup.fetch('entity:1', fetcher),
      dedup.fetch('entity:2', fetcher),
    ]);

    expect(r1).toBe(10);
    expect(r2).toBe(20);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  // ── Cleanup after resolution ──────────────────────────────────────────────────

  it('allows a fresh fetch after the previous one has settled', async () => {
    const dedup = new DataFetchDeduplicator<number>();
    const fetcher = jest.fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    const first = await dedup.fetch('key', fetcher);
    const second = await dedup.fetch('key', fetcher);

    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('cleans up pending entry on rejection', async () => {
    const dedup = new DataFetchDeduplicator<number>();
    const fetcher = jest.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(99);

    // First call rejects.
    await expect(dedup.fetch('key', fetcher)).rejects.toThrow('boom');

    // After rejection the entry should be cleaned up; second call succeeds.
    const result = await dedup.fetch('key', fetcher);
    expect(result).toBe(99);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  // ── pendingCount ──────────────────────────────────────────────────────────────

  it('reports pendingCount of 0 when idle', () => {
    const dedup = new DataFetchDeduplicator<number>();
    expect(dedup.pendingCount).toBe(0);
  });

  it('reports pendingCount > 0 while a fetch is in-flight', () => {
    const dedup = new DataFetchDeduplicator<number>();
    // Never-resolving promise
    dedup.fetch('key', () => new Promise(() => undefined));
    expect(dedup.pendingCount).toBe(1);
  });

  it('pendingCount drops back to 0 after fetch settles', async () => {
    const dedup = new DataFetchDeduplicator<number>();
    await dedup.fetch('key', () => Promise.resolve(5));
    expect(dedup.pendingCount).toBe(0);
  });
});

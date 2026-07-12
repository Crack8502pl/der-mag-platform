/**
 * Variable Engine – IFiberDataService (PR-5 scope)
 *
 * DI contract for any service that can answer fiber-optic–domain queries
 * for a given entity (subsystem/contract).
 *
 * ## Unit conventions
 *
 * - Length values are expressed in **kilometres** (km).
 * - Fiber counts are plain integers (strands).
 * - Connection counts are plain integers.
 */

/** Snapshot of fiber-domain data for one entity. */
export interface FiberData {
  /** Total cable length in kilometres. */
  readonly lengthKm: number;
  /** Total number of fiber strands required. */
  readonly strandCount: number;
  /** Number of fiber connections. */
  readonly connectionCount: number;
  /** Number of DUPLEX connections. */
  readonly duplexCount: number;
  /** Number of WDM connections. */
  readonly wdmCount: number;
}

export interface IFiberDataService {
  /**
   * Return fiber-domain data for the given entity, or `undefined` when the
   * entity does not exist or has no fiber data.
   *
   * Implementations MUST NOT throw – return `undefined` on error.
   *
   * @param entityId   – Numeric identifier of the entity.
   * @param entityType – Domain type (e.g. `'subsystem'`, `'contract'`).
   */
  getFiberData(entityId: number, entityType: string): Promise<FiberData | undefined>;
}

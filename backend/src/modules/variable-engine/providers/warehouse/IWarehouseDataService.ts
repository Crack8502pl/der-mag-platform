/**
 * Variable Engine – IWarehouseDataService (PR-6 scope)
 *
 * DI contract for any service that can answer warehouse-domain queries
 * for a given entity.
 *
 * ## Unit conventions
 *
 * - Item counts are plain integers.
 * - Monetary values are plain numbers.
 */

/** Snapshot of warehouse-domain data for one entity. */
export interface WarehouseData {
  /** Total number of items in the warehouse (all statuses). */
  readonly itemsTotal: number;
  /** Number of items reserved / allocated. */
  readonly itemsReserved: number;
  /** Number of items available for use. */
  readonly itemsAvailable: number;
  /** Total monetary value of all items. */
  readonly valueTotal: number;
  /** Warehouse location descriptor (e.g. building, room, rack). */
  readonly location: string;
}

export interface IWarehouseDataService {
  /**
   * Return warehouse-domain data for the given entity, or `undefined` when
   * the entity does not exist or has no warehouse data.
   *
   * Implementations MUST NOT throw – return `undefined` on error.
   *
   * @param entityId   – Numeric identifier of the entity.
   * @param entityType – Domain type (e.g. `'contract'`, `'subsystem'`).
   */
  getWarehouseData(entityId: number, entityType: string): Promise<WarehouseData | undefined>;
}

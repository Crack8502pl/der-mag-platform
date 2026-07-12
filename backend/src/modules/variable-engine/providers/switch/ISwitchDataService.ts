/**
 * Variable Engine – ISwitchDataService (PR-5 scope)
 *
 * DI contract for any service that can answer network-switch–domain queries
 * for a given entity (subsystem/contract).
 */

/** Snapshot of switch-domain data for one entity. */
export interface SwitchData {
  /** Total number of switches. */
  readonly total: number;
  /** Number of PoE-capable switches. */
  readonly totalPoe: number;
  /** Total number of ports across all switches. */
  readonly totalPorts: number;
  /** Total number of PoE ports across all switches. */
  readonly totalPoePorts: number;
  /** Number of managed switches. */
  readonly managed: number;
}

export interface ISwitchDataService {
  /**
   * Return switch-domain data for the given entity, or `undefined` when the
   * entity does not exist or has no switch data.
   *
   * Implementations MUST NOT throw – return `undefined` on error.
   *
   * @param entityId   – Numeric identifier of the entity.
   * @param entityType – Domain type (e.g. `'subsystem'`, `'contract'`).
   */
  getSwitchData(entityId: number, entityType: string): Promise<SwitchData | undefined>;
}

/**
 * Variable Engine – IIpDataService (PR-5 scope)
 *
 * DI contract for any service that can answer IP-network–domain queries
 * for a given entity (subsystem/contract).
 *
 * ## Unit conventions
 *
 * - IP addresses are represented as dot-decimal strings (e.g. `"192.168.1.1"`).
 * - Host counts are plain integers.
 * - CIDR ranges are strings (e.g. `"172.16.1.0/24"`).
 */

/** Snapshot of IP-network data for one entity. */
export interface IpData {
  /** Allocated CIDR range, e.g. `"172.16.1.0/24"`. */
  readonly allocatedRange: string;
  /** Network gateway address, e.g. `"172.16.1.1"`. */
  readonly gateway: string;
  /** Subnet mask in dot-decimal notation, e.g. `"255.255.255.0"`. */
  readonly subnetMask: string;
  /** Total usable host slots in the allocation. */
  readonly totalHosts: number;
  /** Number of host slots currently occupied. */
  readonly usedHosts: number;
  /** Number of free host slots (`totalHosts - usedHosts`). */
  readonly freeHosts: number;
  /** First usable IP address in the allocation. */
  readonly firstUsableIp: string;
  /** Last usable IP address in the allocation. */
  readonly lastUsableIp: string;
}

export interface IIpDataService {
  /**
   * Return IP-network data for the given entity, or `undefined` when the
   * entity does not exist or has no allocation.
   *
   * Implementations MUST NOT throw – return `undefined` on error.
   *
   * @param entityId   – Numeric identifier of the entity.
   * @param entityType – Domain type (e.g. `'subsystem'`, `'contract'`).
   */
  getIpData(entityId: number, entityType: string): Promise<IpData | undefined>;
}

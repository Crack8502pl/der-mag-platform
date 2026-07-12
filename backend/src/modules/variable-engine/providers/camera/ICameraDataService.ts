/**
 * Variable Engine – ICameraDataService (PR-5 scope)
 *
 * DI contract for any service that can answer camera-domain queries
 * for a given entity (subsystem/contract).
 *
 * The interface is deliberately domain-agnostic with respect to the
 * variable engine core.  Concrete implementations adapt real domain
 * repositories (e.g. `DeviceIPAssignment`) to this contract.
 *
 * ## Naming convention
 *
 * All counts are plain integers.  Storage is expressed in TB (number).
 */

/** Snapshot of camera-domain data for one entity. */
export interface CameraData {
  /** Total number of cameras (all categories). */
  readonly total: number;
  /** Number of IP cameras. */
  readonly totalIp: number;
  /** Number of general-purpose IP cameras. */
  readonly totalIpOgolna: number;
  /** Number of LPR IP cameras. */
  readonly totalIpLpr: number;
  /** Number of SKP IP cameras. */
  readonly totalIpSkp: number;
  /** Number of analog cameras. */
  readonly totalAnalog: number;
  /** Total required storage capacity in TB. */
  readonly storageTb: number;
  /** Recording retention in days. */
  readonly recordingDays: number;
  /** Average bitrate per camera in Mbps. */
  readonly bitrateMbps: number;
}

export interface ICameraDataService {
  /**
   * Return camera-domain data for the given entity, or `undefined` when the
   * entity does not exist or has no camera data.
   *
   * Implementations MUST NOT throw – return `undefined` on error.
   *
   * @param entityId   – Numeric identifier of the entity (e.g. subsystem ID).
   * @param entityType – Domain type (e.g. `'subsystem'`, `'contract'`).
   */
  getCameraData(entityId: number, entityType: string): Promise<CameraData | undefined>;
}

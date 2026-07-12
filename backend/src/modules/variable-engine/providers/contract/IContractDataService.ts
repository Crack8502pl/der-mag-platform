/**
 * Variable Engine – IContractDataService (PR-6 scope)
 *
 * DI contract for any service that can answer contract-domain queries
 * for a given entity.
 *
 * ## Unit conventions
 *
 * - Monetary values are expressed as plain numbers (currency determined by
 *   the domain service implementation).
 * - Dates are ISO 8601 strings (e.g. `"2024-01-15"`).
 * - Status values are domain-defined strings (e.g. `"active"`, `"closed"`).
 */

/** Snapshot of contract-domain data for one entity. */
export interface ContractData {
  /** Unique contract number / identifier. */
  readonly number: string;
  /** Current contract status (e.g. `"active"`, `"pending"`, `"closed"`). */
  readonly status: string;
  /** Full name of the contracting customer / company. */
  readonly customerName: string;
  /** Customer tax identification number (NIP). */
  readonly customerNip: string;
  /** Net contract value (before tax). */
  readonly valueNet: number;
  /** Gross contract value (after tax). */
  readonly valueGross: number;
  /** Contract start date as an ISO 8601 string. */
  readonly dateStart: string;
  /** Contract end date as an ISO 8601 string. */
  readonly dateEnd: string;
}

export interface IContractDataService {
  /**
   * Return contract-domain data for the given entity, or `undefined` when
   * the entity does not exist or has no contract data.
   *
   * Implementations MUST NOT throw – return `undefined` on error.
   *
   * @param entityId   – Numeric identifier of the entity (e.g. contract ID).
   * @param entityType – Domain type (e.g. `'contract'`, `'subsystem'`).
   */
  getContractData(entityId: number, entityType: string): Promise<ContractData | undefined>;
}

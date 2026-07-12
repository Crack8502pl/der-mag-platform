/**
 * Variable Engine – IAiDataService (PR-6 scope)
 *
 * DI contract for any service that can answer AI-generated insights
 * for a given entity.
 *
 * AI responses are typically pre-computed / cached on the domain side.
 * The interface is intentionally simple: one snapshot per entity.
 *
 * ## Unit conventions
 *
 * - `riskScore` is an integer in the range 0–100.
 * - `riskLevel` is a human-readable label derived from `riskScore`
 *   (e.g. `"low"`, `"medium"`, `"high"`).
 */

/** Snapshot of AI-generated insights for one entity. */
export interface AiData {
  /** Short AI-generated summary of the entity. */
  readonly summary: string;
  /** AI-generated recommendation text. */
  readonly recommendation: string;
  /** Human-readable risk level (e.g. `"low"`, `"medium"`, `"high"`). */
  readonly riskLevel: string;
  /** Numeric risk score in the range 0–100. */
  readonly riskScore: number;
}

export interface IAiDataService {
  /**
   * Return AI-generated data for the given entity, or `undefined` when the
   * entity does not exist or no AI analysis is available.
   *
   * Implementations MUST NOT throw – return `undefined` on error.
   *
   * @param entityId   – Numeric identifier of the entity.
   * @param entityType – Domain type (e.g. `'contract'`, `'task'`).
   */
  getAiData(entityId: number, entityType: string): Promise<AiData | undefined>;
}

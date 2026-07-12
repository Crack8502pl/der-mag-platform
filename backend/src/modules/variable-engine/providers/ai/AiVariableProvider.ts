/**
 * Variable Engine – AiVariableProvider (PR-6 scope)
 *
 * Resolves `ai.*` variable expressions by delegating to an injected
 * `IAiDataService`.
 *
 * ## Supported expressions
 *
 * | Expression            | Type   | Description                                         |
 * |-----------------------|--------|-----------------------------------------------------|
 * | `ai.summary`          | string | AI-generated summary of the entity.                 |
 * | `ai.recommendation`   | string | AI-generated recommendation text.                   |
 * | `ai.risk.level`       | string | Risk level label (e.g. `"low"`, `"high"`).          |
 * | `ai.risk.score`       | number | Numeric risk score (0–100).                         |
 *
 * ## Soft-fail
 *
 * Returns `undefined` for unrecognised field names, when `entityId` is
 * missing/invalid, or when the data service returns no data.  Never throws.
 *
 * ## DI
 *
 * Inject a concrete `IAiDataService` via the constructor.
 */

import { AbstractVariableProvider } from '../AbstractVariableProvider';
import type { VariableContext, VariableValue } from '../../contracts';
import type { IAiDataService, AiData } from './IAiDataService';
import { DataFetchDeduplicator } from '../DataFetchDeduplicator';

/** All field paths exposed under the `ai` namespace. */
type AiField =
  | 'summary'
  | 'recommendation'
  | 'risk.level'
  | 'risk.score';

const SUPPORTED_FIELDS: ReadonlySet<string> = new Set<AiField>([
  'summary',
  'recommendation',
  'risk.level',
  'risk.score',
]);

export class AiVariableProvider extends AbstractVariableProvider {
  readonly namespaces = ['ai'] as const;

  private readonly aiService: IAiDataService;
  private readonly deduplicator = new DataFetchDeduplicator<AiData>();

  /**
   * @param aiService – Injected AI data service (DI, not static singleton).
   */
  constructor(aiService: IAiDataService) {
    super();
    this.aiService = aiService;
  }

  async resolve(expression: string, context: VariableContext): Promise<VariableValue> {
    const field = this.extractField(expression);

    if (!SUPPORTED_FIELDS.has(field)) {
      return undefined;
    }

    const entityId = this.parseEntityId(context.entityId);
    if (entityId === undefined) {
      return undefined;
    }

    const entityType = context.entityType ?? '';
    const entityKey = `${entityId}:${entityType}`;
    const data = await this.deduplicator.fetch(entityKey, () =>
      this.aiService.getAiData(entityId, entityType)
    );

    if (data === undefined) {
      return undefined;
    }

    return this.pick(field as AiField, data);
  }

  // ─── Field picker ─────────────────────────────────────────────────────────

  private pick(field: AiField, data: AiData): VariableValue {
    switch (field) {
      case 'summary':
        return data.summary;
      case 'recommendation':
        return data.recommendation;
      case 'risk.level':
        return data.riskLevel;
      case 'risk.score':
        return data.riskScore;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  // parseEntityId is inherited from AbstractVariableProvider.
}

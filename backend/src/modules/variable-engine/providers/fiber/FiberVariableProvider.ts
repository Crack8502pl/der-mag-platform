/**
 * Variable Engine – FiberVariableProvider (PR-5 scope)
 *
 * Resolves `fiber.*` variable expressions by delegating to an injected
 * `IFiberDataService`.
 *
 * ## Supported expressions
 *
 * | Expression                  | Type   | Description                                  |
 * |-----------------------------|--------|----------------------------------------------|
 * | `fiber.length.total`        | number | Total cable length in kilometres.             |
 * | `fiber.strands.total`       | number | Total number of fiber strands required.       |
 * | `fiber.connections.total`   | number | Total number of fiber connections.            |
 * | `fiber.connections.duplex`  | number | Number of DUPLEX connections.                 |
 * | `fiber.connections.wdm`     | number | Number of WDM connections.                   |
 *
 * ## Soft-fail
 *
 * Returns `undefined` for unrecognised field names, when `entityId` is
 * missing/invalid, or when the data service returns no data.  Never throws.
 *
 * ## DI
 *
 * Inject a concrete `IFiberDataService` via the constructor.
 */

import { AbstractVariableProvider } from '../AbstractVariableProvider';
import type { VariableContext, VariableValue } from '../../contracts';
import type { IFiberDataService, FiberData } from './IFiberDataService';

/** All field paths exposed under the `fiber` namespace. */
type FiberField =
  | 'length.total'
  | 'strands.total'
  | 'connections.total'
  | 'connections.duplex'
  | 'connections.wdm';

const SUPPORTED_FIELDS: ReadonlySet<string> = new Set<FiberField>([
  'length.total',
  'strands.total',
  'connections.total',
  'connections.duplex',
  'connections.wdm',
]);

export class FiberVariableProvider extends AbstractVariableProvider {
  readonly namespaces = ['fiber'] as const;

  private readonly fiberService: IFiberDataService;

  /**
   * @param fiberService – Injected fiber data service (DI, not static singleton).
   */
  constructor(fiberService: IFiberDataService) {
    super();
    this.fiberService = fiberService;
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
    const data = await this.fiberService.getFiberData(entityId, entityType);

    if (data === undefined) {
      return undefined;
    }

    return this.pick(field as FiberField, data);
  }

  // ─── Field picker ─────────────────────────────────────────────────────────

  private pick(field: FiberField, data: FiberData): VariableValue {
    switch (field) {
      case 'length.total':
        return data.lengthKm;
      case 'strands.total':
        return data.strandCount;
      case 'connections.total':
        return data.connectionCount;
      case 'connections.duplex':
        return data.duplexCount;
      case 'connections.wdm':
        return data.wdmCount;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Convert `context.entityId` to a `number`.
   * Returns `undefined` for `undefined`, empty strings, or non-numeric strings.
   */
  private parseEntityId(entityId: number | string | undefined): number | undefined {
    if (entityId === undefined) return undefined;
    if (typeof entityId === 'number') return Number.isFinite(entityId) ? entityId : undefined;
    const parsed = Number(entityId);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}

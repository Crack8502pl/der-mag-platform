/**
 * Variable Engine – SwitchVariableProvider (PR-5 scope)
 *
 * Resolves `switch.*` variable expressions by delegating to an injected
 * `ISwitchDataService`.
 *
 * ## Supported expressions
 *
 * | Expression              | Type   | Description                                       |
 * |-------------------------|--------|---------------------------------------------------|
 * | `switch.total`          | number | Total number of switches.                         |
 * | `switch.total.poe`      | number | Number of PoE-capable switches.                   |
 * | `switch.total.managed`  | number | Number of managed switches.                       |
 * | `switch.ports.total`    | number | Total port count across all switches.             |
 * | `switch.ports.poe`      | number | Total PoE port count across all switches.         |
 *
 * ## Soft-fail
 *
 * Returns `undefined` for unrecognised field names, when `entityId` is
 * missing/invalid, or when the data service returns no data.  Never throws.
 *
 * ## DI
 *
 * Inject a concrete `ISwitchDataService` via the constructor.
 */

import { AbstractVariableProvider } from '../AbstractVariableProvider';
import type { VariableContext, VariableValue } from '../../contracts';
import type { ISwitchDataService, SwitchData } from './ISwitchDataService';
import { DataFetchDeduplicator } from '../DataFetchDeduplicator';

/** All field paths exposed under the `switch` namespace. */
type SwitchField =
  | 'total'
  | 'total.poe'
  | 'total.managed'
  | 'ports.total'
  | 'ports.poe';

const SUPPORTED_FIELDS: ReadonlySet<string> = new Set<SwitchField>([
  'total',
  'total.poe',
  'total.managed',
  'ports.total',
  'ports.poe',
]);

export class SwitchVariableProvider extends AbstractVariableProvider {
  readonly namespaces = ['switch'] as const;

  private readonly switchService: ISwitchDataService;
  private readonly deduplicator = new DataFetchDeduplicator<SwitchData>();

  /**
   * @param switchService – Injected switch data service (DI, not static singleton).
   */
  constructor(switchService: ISwitchDataService) {
    super();
    this.switchService = switchService;
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
      this.switchService.getSwitchData(entityId, entityType)
    );

    if (data === undefined) {
      return undefined;
    }

    return this.pick(field as SwitchField, data);
  }

  // ─── Field picker ─────────────────────────────────────────────────────────

  private pick(field: SwitchField, data: SwitchData): VariableValue {
    switch (field) {
      case 'total':
        return data.total;
      case 'total.poe':
        return data.totalPoe;
      case 'total.managed':
        return data.managed;
      case 'ports.total':
        return data.totalPorts;
      case 'ports.poe':
        return data.totalPoePorts;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  // parseEntityId is inherited from AbstractVariableProvider.
}

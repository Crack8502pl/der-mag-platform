/**
 * Variable Engine – WarehouseVariableProvider (PR-6 scope)
 *
 * Resolves `warehouse.*` variable expressions by delegating to an injected
 * `IWarehouseDataService`.
 *
 * ## Supported expressions
 *
 * | Expression                  | Type   | Description                                   |
 * |-----------------------------|--------|-----------------------------------------------|
 * | `warehouse.items.total`     | number | Total number of items (all statuses).         |
 * | `warehouse.items.reserved`  | number | Number of reserved / allocated items.         |
 * | `warehouse.items.available` | number | Number of items available for use.            |
 * | `warehouse.value.total`     | number | Total monetary value of all items.            |
 * | `warehouse.location`        | string | Warehouse location descriptor.                |
 *
 * ## Soft-fail
 *
 * Returns `undefined` for unrecognised field names, when `entityId` is
 * missing/invalid, or when the data service returns no data.  Never throws.
 *
 * ## DI
 *
 * Inject a concrete `IWarehouseDataService` via the constructor.
 */

import { AbstractVariableProvider } from '../AbstractVariableProvider';
import type { VariableContext, VariableValue } from '../../contracts';
import type { IWarehouseDataService, WarehouseData } from './IWarehouseDataService';
import { DataFetchDeduplicator } from '../DataFetchDeduplicator';

/** All field paths exposed under the `warehouse` namespace. */
type WarehouseField =
  | 'items.total'
  | 'items.reserved'
  | 'items.available'
  | 'value.total'
  | 'location';

const SUPPORTED_FIELDS: ReadonlySet<string> = new Set<WarehouseField>([
  'items.total',
  'items.reserved',
  'items.available',
  'value.total',
  'location',
]);

export class WarehouseVariableProvider extends AbstractVariableProvider {
  readonly namespaces = ['warehouse'] as const;

  private readonly warehouseService: IWarehouseDataService;
  private readonly deduplicator = new DataFetchDeduplicator<WarehouseData>();

  /**
   * @param warehouseService – Injected warehouse data service (DI, not static singleton).
   */
  constructor(warehouseService: IWarehouseDataService) {
    super();
    this.warehouseService = warehouseService;
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
      this.warehouseService.getWarehouseData(entityId, entityType)
    );

    if (data === undefined) {
      return undefined;
    }

    return this.pick(field as WarehouseField, data);
  }

  // ─── Field picker ─────────────────────────────────────────────────────────

  private pick(field: WarehouseField, data: WarehouseData): VariableValue {
    switch (field) {
      case 'items.total':
        return data.itemsTotal;
      case 'items.reserved':
        return data.itemsReserved;
      case 'items.available':
        return data.itemsAvailable;
      case 'value.total':
        return data.valueTotal;
      case 'location':
        return data.location;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  // parseEntityId is inherited from AbstractVariableProvider.
}

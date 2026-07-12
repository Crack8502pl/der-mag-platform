/**
 * Variable Engine – ContractVariableProvider (PR-6 scope)
 *
 * Resolves `contract.*` variable expressions by delegating to an injected
 * `IContractDataService`.
 *
 * ## Supported expressions
 *
 * | Expression                  | Type   | Description                                |
 * |-----------------------------|--------|--------------------------------------------|
 * | `contract.number`           | string | Contract number / identifier.              |
 * | `contract.status`           | string | Contract status (e.g. `"active"`).         |
 * | `contract.customer.name`    | string | Contracting customer full name.            |
 * | `contract.customer.nip`     | string | Customer tax identification number (NIP).  |
 * | `contract.value.net`        | number | Net contract value.                        |
 * | `contract.value.gross`      | number | Gross contract value.                      |
 * | `contract.date.start`       | string | Contract start date (ISO 8601).            |
 * | `contract.date.end`         | string | Contract end date (ISO 8601).              |
 *
 * ## Soft-fail
 *
 * Returns `undefined` for unrecognised field names, when `entityId` is
 * missing/invalid, or when the data service returns no data.  Never throws.
 *
 * ## DI
 *
 * Inject a concrete `IContractDataService` via the constructor.
 */

import { AbstractVariableProvider } from '../AbstractVariableProvider';
import type { VariableContext, VariableValue } from '../../contracts';
import type { IContractDataService, ContractData } from './IContractDataService';
import { DataFetchDeduplicator } from '../DataFetchDeduplicator';

/** All field paths exposed under the `contract` namespace. */
type ContractField =
  | 'number'
  | 'status'
  | 'customer.name'
  | 'customer.nip'
  | 'value.net'
  | 'value.gross'
  | 'date.start'
  | 'date.end';

const SUPPORTED_FIELDS: ReadonlySet<string> = new Set<ContractField>([
  'number',
  'status',
  'customer.name',
  'customer.nip',
  'value.net',
  'value.gross',
  'date.start',
  'date.end',
]);

export class ContractVariableProvider extends AbstractVariableProvider {
  readonly namespaces = ['contract'] as const;

  private readonly contractService: IContractDataService;
  private readonly deduplicator = new DataFetchDeduplicator<ContractData>();

  /**
   * @param contractService – Injected contract data service (DI, not static singleton).
   */
  constructor(contractService: IContractDataService) {
    super();
    this.contractService = contractService;
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
      this.contractService.getContractData(entityId, entityType)
    );

    if (data === undefined) {
      return undefined;
    }

    return this.pick(field as ContractField, data);
  }

  // ─── Field picker ─────────────────────────────────────────────────────────

  private pick(field: ContractField, data: ContractData): VariableValue {
    switch (field) {
      case 'number':
        return data.number;
      case 'status':
        return data.status;
      case 'customer.name':
        return data.customerName;
      case 'customer.nip':
        return data.customerNip;
      case 'value.net':
        return data.valueNet;
      case 'value.gross':
        return data.valueGross;
      case 'date.start':
        return data.dateStart;
      case 'date.end':
        return data.dateEnd;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  // parseEntityId is inherited from AbstractVariableProvider.
}

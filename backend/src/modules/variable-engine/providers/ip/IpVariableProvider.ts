/**
 * Variable Engine – IpVariableProvider (PR-5 scope)
 *
 * Resolves `ip.*` variable expressions by delegating to an injected
 * `IIpDataService`.
 *
 * ## Supported expressions
 *
 * | Expression          | Type   | Description                                         |
 * |---------------------|--------|-----------------------------------------------------|
 * | `ip.range`          | string | Allocated CIDR range, e.g. `"172.16.1.0/24"`.      |
 * | `ip.gateway`        | string | Network gateway address.                            |
 * | `ip.subnet.mask`    | string | Subnet mask in dot-decimal notation.                |
 * | `ip.hosts.total`    | number | Total usable host slots.                            |
 * | `ip.hosts.used`     | number | Number of currently occupied host slots.            |
 * | `ip.hosts.free`     | number | Number of free host slots.                          |
 * | `ip.first`          | string | First usable IP address.                            |
 * | `ip.last`           | string | Last usable IP address.                             |
 *
 * ## Soft-fail
 *
 * Returns `undefined` for unrecognised field names, when `entityId` is
 * missing/invalid, or when the data service returns no data.  Never throws.
 *
 * ## DI
 *
 * Inject a concrete `IIpDataService` via the constructor.
 */

import { AbstractVariableProvider } from '../AbstractVariableProvider';
import type { VariableContext, VariableValue } from '../../contracts';
import type { IIpDataService, IpData } from './IIpDataService';

/** All field paths exposed under the `ip` namespace. */
type IpField =
  | 'range'
  | 'gateway'
  | 'subnet.mask'
  | 'hosts.total'
  | 'hosts.used'
  | 'hosts.free'
  | 'first'
  | 'last';

const SUPPORTED_FIELDS: ReadonlySet<string> = new Set<IpField>([
  'range',
  'gateway',
  'subnet.mask',
  'hosts.total',
  'hosts.used',
  'hosts.free',
  'first',
  'last',
]);

export class IpVariableProvider extends AbstractVariableProvider {
  readonly namespaces = ['ip'] as const;

  private readonly ipService: IIpDataService;

  /**
   * @param ipService – Injected IP data service (DI, not static singleton).
   */
  constructor(ipService: IIpDataService) {
    super();
    this.ipService = ipService;
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
    const data = await this.ipService.getIpData(entityId, entityType);

    if (data === undefined) {
      return undefined;
    }

    return this.pick(field as IpField, data);
  }

  // ─── Field picker ─────────────────────────────────────────────────────────

  private pick(field: IpField, data: IpData): VariableValue {
    switch (field) {
      case 'range':
        return data.allocatedRange;
      case 'gateway':
        return data.gateway;
      case 'subnet.mask':
        return data.subnetMask;
      case 'hosts.total':
        return data.totalHosts;
      case 'hosts.used':
        return data.usedHosts;
      case 'hosts.free':
        return data.freeHosts;
      case 'first':
        return data.firstUsableIp;
      case 'last':
        return data.lastUsableIp;
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

/**
 * Variable Engine – CameraVariableProvider (PR-5 scope)
 *
 * Resolves `camera.*` variable expressions by delegating to an injected
 * `ICameraDataService`.
 *
 * ## Supported expressions
 *
 * | Expression             | Type   | Description                                        |
 * |------------------------|--------|----------------------------------------------------|
 * | `camera.total`         | number | Total number of cameras (all types).               |
 * | `camera.total.ip`      | number | Number of IP cameras.                              |
 * | `camera.total.analog`  | number | Number of analog cameras.                          |
 * | `camera.storage.tb`    | number | Required storage capacity in TB.                   |
 * | `camera.recording.days`| number | Recording retention in days.                        |
 * | `camera.bitrate.mbps`  | number | Average bitrate per camera in Mbps.                |
 *
 * ## Soft-fail
 *
 * Returns `undefined` for unrecognised field names, when `entityId` is
 * missing/invalid, or when the data service returns no data.  Never throws.
 *
 * ## DI
 *
 * Inject a concrete `ICameraDataService` via the constructor.
 */

import { AbstractVariableProvider } from '../AbstractVariableProvider';
import type { VariableContext, VariableValue } from '../../contracts';
import type { ICameraDataService, CameraData } from './ICameraDataService';
import { DataFetchDeduplicator } from '../DataFetchDeduplicator';

/** All field paths exposed under the `camera` namespace. */
type CameraField =
  | 'total'
  | 'total.ip'
  | 'total.analog'
  | 'storage.tb'
  | 'recording.days'
  | 'bitrate.mbps';

const SUPPORTED_FIELDS: ReadonlySet<string> = new Set<CameraField>([
  'total',
  'total.ip',
  'total.analog',
  'storage.tb',
  'recording.days',
  'bitrate.mbps',
]);

export class CameraVariableProvider extends AbstractVariableProvider {
  readonly namespaces = ['camera'] as const;

  private readonly cameraService: ICameraDataService;
  private readonly deduplicator = new DataFetchDeduplicator<CameraData>();

  /**
   * @param cameraService – Injected camera data service (DI, not static singleton).
   */
  constructor(cameraService: ICameraDataService) {
    super();
    this.cameraService = cameraService;
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
      this.cameraService.getCameraData(entityId, entityType)
    );

    if (data === undefined) {
      return undefined;
    }

    return this.pick(field as CameraField, data);
  }

  // ─── Field picker ─────────────────────────────────────────────────────────

  private pick(field: CameraField, data: CameraData): VariableValue {
    switch (field) {
      case 'total':
        return data.total;
      case 'total.ip':
        return data.totalIp;
      case 'total.analog':
        return data.totalAnalog;
      case 'storage.tb':
        return data.storageTb;
      case 'recording.days':
        return data.recordingDays;
      case 'bitrate.mbps':
        return data.bitrateMbps;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  // parseEntityId is inherited from AbstractVariableProvider.
}

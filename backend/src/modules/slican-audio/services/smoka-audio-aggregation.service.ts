export type SlicanHierarchyAudioNodeType = 'LCS' | 'Nastawnia' | 'Przejazd' | 'SKP' | 'Point';
export type SlicanHierarchyAudioDeviceType =
  | 'DPH_IP'
  | 'AUDIO_IP'
  | 'CTS220_IP'
  | 'IVR'
  | 'CONFERENCE';

export interface SlicanHierarchyAudioNode {
  id: string;
  type: SlicanHierarchyAudioNodeType;
  parentId?: string;
  ownerId?: string;
  items: Array<{
    id?: string;
    deviceId?: string;
    deviceType: SlicanHierarchyAudioDeviceType;
    quantity: number;
  }>;
}

export interface SlicanAudioAggregate {
  dphIpDevices: number;
  audioIpDevices: number;
  cts220IpDevices: number;
  ivrChannels: number;
  conferenceChannels: number;
}

export interface SlicanAudioAggregationResult {
  aggregate: SlicanAudioAggregate;
  warnings: string[];
}

const NODE_TYPES = new Set<SlicanHierarchyAudioNodeType>([
  'LCS', 'Nastawnia', 'Przejazd', 'SKP', 'Point'
]);
const DEVICE_FIELDS: Record<SlicanHierarchyAudioDeviceType, keyof SlicanAudioAggregate> = {
  DPH_IP: 'dphIpDevices',
  AUDIO_IP: 'audioIpDevices',
  CTS220_IP: 'cts220IpDevices',
  IVR: 'ivrChannels',
  CONFERENCE: 'conferenceChannels'
};
const DEVICE_TYPES = new Set(Object.keys(DEVICE_FIELDS));

const emptyAggregate = (): SlicanAudioAggregate => ({
  dphIpDevices: 0,
  audioIpDevices: 0,
  cts220IpDevices: 0,
  ivrChannels: 0,
  conferenceChannels: 0
});

export class SlicanAudioAggregationValidationError extends Error {}

export class SmokaAudioAggregationService {
  aggregateHierarchy(nodes: SlicanHierarchyAudioNode[]): SlicanAudioAggregationResult {
    if (!Array.isArray(nodes)) {
      throw new SlicanAudioAggregationValidationError('Lista węzłów audio musi być tablicą.');
    }

    const aggregate = emptyAggregate();
    const warnings: string[] = [];
    const seenNodes = new Set<string>();
    const seenDevices = new Map<string, SlicanHierarchyAudioNode>();

    for (const node of nodes) {
      if (!node || typeof node.id !== 'string' || !node.id.trim() ||
          !NODE_TYPES.has(node.type) || !Array.isArray(node.items) ||
          (node.parentId !== undefined && (typeof node.parentId !== 'string' || !node.parentId.trim()))) {
        throw new SlicanAudioAggregationValidationError('Nieprawidłowy węzeł hierarchii audio.');
      }
      if (node.ownerId !== undefined && (typeof node.ownerId !== 'string' || !node.ownerId.trim())) {
        throw new SlicanAudioAggregationValidationError('Nieprawidłowy ownerId węzła audio.');
      }
      if (seenNodes.has(node.id)) {
        warnings.push(`Powielony węzeł audio ${node.id}; pominięto jego ponowne zliczenie.`);
        continue;
      }
      seenNodes.add(node.id);

      for (const item of node.items) {
        if (!item || !DEVICE_TYPES.has(item.deviceType)) {
          throw new SlicanAudioAggregationValidationError('Nieobsługiwany typ urządzenia audio.');
        }
        if (!Number.isSafeInteger(item.quantity) || item.quantity < 0) {
          throw new SlicanAudioAggregationValidationError('Ilość urządzeń audio musi być nieujemną liczbą całkowitą.');
        }

        const deviceId = item.id ?? item.deviceId;
        if (deviceId !== undefined && (typeof deviceId !== 'string' || !deviceId.trim())) {
          throw new SlicanAudioAggregationValidationError('Nieprawidłowy identyfikator urządzenia audio.');
        }
        if (deviceId) {
          const previousNode = seenDevices.get(deviceId);
          if (previousNode) {
            if (previousNode.parentId !== node.parentId) {
              warnings.push(`Urządzenie audio ${deviceId} występuje pod różnymi rodzicami; zliczono je tylko raz.`);
            } else {
              warnings.push(`Powielone urządzenie audio ${deviceId}; zliczono je tylko raz.`);
            }
            continue;
          }
          seenDevices.set(deviceId, node);
        }
        const field = DEVICE_FIELDS[item.deviceType];
        const total = aggregate[field] + item.quantity;
        if (!Number.isSafeInteger(total)) {
          throw new SlicanAudioAggregationValidationError('Suma urządzeń audio przekracza dopuszczalny zakres.');
        }
        aggregate[field] = total;
      }
    }

    return { aggregate, warnings };
  }

  aggregateOwner(ownerId: string, nodes: SlicanHierarchyAudioNode[]): SlicanAudioAggregationResult {
    if (typeof ownerId !== 'string' || !ownerId.trim()) {
      throw new SlicanAudioAggregationValidationError('ownerId jest wymagany.');
    }
    if (!Array.isArray(nodes)) {
      throw new SlicanAudioAggregationValidationError('Lista węzłów audio musi być tablicą.');
    }
    this.aggregateHierarchy(nodes);
    const ownerExists = nodes.some(node => node && node.id === ownerId);
    if (!ownerExists) {
      return {
        aggregate: emptyAggregate(),
        warnings: [`Nie znaleziono właściciela audio ${ownerId}; pominięto agregację.`]
      };
    }

    const ownerNodes = nodes.filter(node => node.id === ownerId || node.ownerId === ownerId);
    const result = this.aggregateHierarchy(ownerNodes);
    const mismatches = nodes
      .filter(node => node.ownerId && node.ownerId !== ownerId)
      .map(node => node.id);
    if (mismatches.length > 0) {
      result.warnings.push(`Pominięto węzły audio przypisane do innego właściciela: ${mismatches.join(', ')}.`);
    }
    return result;
  }
}

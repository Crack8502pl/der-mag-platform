import { AppDataSource } from '../../../config/database';
import { SlicanCentralSpecification } from '../../../entities/SlicanCentralSpecification';
import { SlicanLicenseSpecification } from '../../../entities/SlicanLicenseSpecification';
import { SlicanVoipSubscriberFormula } from '../../../entities/SlicanVoipSubscriberFormula';
import {
  calculateVoipSubscribers,
  defaultMultipliers,
  selectCentral,
  SlicanAudioDemand
} from '../../../services/SlicanAudioService';

type LicenseItem = { warehouseStockId: number; quantity: number };

export interface SlicanAudioResolution {
  centralRecommendation: { warehouseStockId: number; modelName: string } | null;
  licenses: Array<{ type: string; items: LicenseItem[] }>;
  warnings: string[];
  bomItems: LicenseItem[];
}

const LICENSE_DEMAND_FIELD: Record<string, string> = {
  VOIP_SUBSCRIBER: 'sipVoipSubscribers',
  AUDIO: 'audioDevices',
  IVR: 'ivrChannels',
  CONFERENCE: 'conferenceChannels'
};

const DEMAND_VALUE_FIELD: Record<string, keyof SlicanAudioDemand | 'sipVoipSubscribers'> = {
  sipVoipSubscribers: 'sipVoipSubscribers',
  audioDevices: 'audioIpDevices',
  ivrChannels: 'ivrChannels',
  conferenceChannels: 'conferenceChannels'
};

const DEMAND_FIELDS: Array<keyof SlicanAudioDemand> = [
  'dphIpDevices',
  'audioIpDevices',
  'cts220IpDevices',
  'ivrChannels',
  'conferenceChannels'
];

function isValidDemand(demand: SlicanAudioDemand): boolean {
  return demand !== null && typeof demand === 'object' &&
    DEMAND_FIELDS.every(field => Number.isSafeInteger(demand[field]) && demand[field] >= 0);
}

function packageDemand(demand: number, sizes: number[]): Record<number, number> {
  const packages: Record<number, number> = {};
  let remaining = demand;

  for (const size of [...sizes].sort((a, b) => b - a).slice(0, -1)) {
    const quantity = Math.floor(remaining / size);
    const remainder = remaining % size;
    const roundUp = remainder >= size - 1;
    if (quantity + Number(roundUp) > 0) packages[size] = quantity + Number(roundUp);
    remaining = roundUp ? 0 : remainder;
  }

  const smallest = Math.min(...sizes);
  if (remaining > 0) packages[smallest] = (packages[smallest] ?? 0) + remaining;
  return packages;
}

export class SlicanAudioResolverService {
  async resolveForSmokA(demand: SlicanAudioDemand): Promise<SlicanAudioResolution> {
    if (!isValidDemand(demand)) {
      throw new RangeError('Zapotrzebowanie audio musi zawierać pięć nieujemnych liczb całkowitych.');
    }

    const centralRepository = AppDataSource.getRepository(SlicanCentralSpecification);
    const licenseRepository = AppDataSource.getRepository(SlicanLicenseSpecification);
    const [centrals, allLicenses, formula] = await Promise.all([
      centralRepository.find(),
      licenseRepository.find(),
      AppDataSource.getRepository(SlicanVoipSubscriberFormula).findOneBy({ id: 1 })
    ]);

    const bomItems: LicenseItem[] = [
      ...centrals.map(central => ({ warehouseStockId: central.warehouseStockId, quantity: 0 })),
      ...allLicenses.map(license => ({ warehouseStockId: license.warehouseStockId, quantity: 0 }))
    ];
    const warnings: string[] = [];

    if (DEMAND_FIELDS.every(field => demand[field] === 0)) {
      return { centralRecommendation: null, licenses: [], warnings, bomItems };
    }

    if (!formula) warnings.push('Brak konfiguracji mnożników Slican VoIP; użyto wartości domyślnych.');
    const sipVoipSubscribers = calculateVoipSubscribers(demand, formula ?? defaultMultipliers);
    if (!Number.isSafeInteger(sipVoipSubscribers)) {
      throw new RangeError('Wyliczone zapotrzebowanie VoIP przekracza dopuszczalny zakres.');
    }

    const activeCentrals = centrals.filter(central => central.isActive);
    const central = selectCentral(centrals, demand, sipVoipSubscribers);
    if (!central) {
      if (activeCentrals.length === 0) {
        warnings.push('Brak aktywnych central Slican audio.');
      } else {
        warnings.push(
          'Żadna centrala nie spełnia zapotrzebowania:',
          `  SIP/VoIP: ${sipVoipSubscribers}`,
          `  DPH.IP: ${demand.dphIpDevices}`,
          `  Audio.IP: ${demand.audioIpDevices}`,
          `  IVR: ${demand.ivrChannels}`,
          `  Konferencje: ${demand.conferenceChannels}`
        );
      }
      return { centralRecommendation: null, licenses: [], warnings, bomItems };
    }

    const licenses: SlicanAudioResolution['licenses'] = [];
    for (const [type, expectedField] of Object.entries(LICENSE_DEMAND_FIELD)) {
      const output = { type, items: [] as LicenseItem[] };
      licenses.push(output);

      const active = allLicenses.filter(license =>
        license.isActive && license.licenseType === type
      );
      const configuredField = active[0]?.demandField ?? expectedField;
      if (active.some(license => license.demandField !== configuredField) ||
          configuredField !== expectedField) {
        warnings.push(`Niejednoznaczna konfiguracja zapotrzebowania licencji ${type}.`);
        continue;
      }
      const field = DEMAND_VALUE_FIELD[configuredField];
      const requested = field === 'sipVoipSubscribers'
        ? sipVoipSubscribers
        : demand[field as keyof SlicanAudioDemand];
      if (requested === 0) continue;
      if (active.length === 0) {
        warnings.push(`Brak aktywnych licencji typu ${type}.`);
        continue;
      }

      const bySize = new Map<number, SlicanLicenseSpecification>();
      let ambiguous = false;
      for (const license of active) {
        if (bySize.has(license.packageSize)) ambiguous = true;
        bySize.set(license.packageSize, license);
      }
      if (ambiguous) {
        warnings.push(`Niejednoznaczna konfiguracja pakietów licencji ${type}.`);
        continue;
      }
      if (!bySize.has(1)) {
        warnings.push(`Brakuje pakietu rozmiaru 1 dla ${type}.`);
        continue;
      }

      const packages = packageDemand(requested, [...bySize.keys()]);
      for (const [size, quantity] of Object.entries(packages)) {
        const license = bySize.get(Number(size));
        if (!license) {
          warnings.push(`Brakuje pakietu rozmiaru ${size} dla ${type}.`);
          output.items = [];
          break;
        }
        output.items.push({ warehouseStockId: license.warehouseStockId, quantity });
      }
    }

    for (const item of licenses.flatMap(license => license.items)) {
      const bomItem = bomItems.find(candidate => candidate.warehouseStockId === item.warehouseStockId);
      if (bomItem) bomItem.quantity = item.quantity;
    }
    const centralBomItem = bomItems.find(item => item.warehouseStockId === central.warehouseStockId);
    if (centralBomItem) centralBomItem.quantity = 1;

    return {
      centralRecommendation: {
        warehouseStockId: central.warehouseStockId,
        modelName: central.modelName
      },
      licenses,
      warnings,
      bomItems
    };
  }
}

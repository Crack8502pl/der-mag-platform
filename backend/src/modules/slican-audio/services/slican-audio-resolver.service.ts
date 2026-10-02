import { AppDataSource } from '../../../config/database';
import { SlicanCentralSpecification } from '../../../entities/SlicanCentralSpecification';
import { SlicanLicenseSpecification } from '../../../entities/SlicanLicenseSpecification';
import { SlicanVoipSubscriberFormula } from '../../../entities/SlicanVoipSubscriberFormula';
import {
  calculateVoipSubscribers,
  defaultMultipliers,
  SlicanAudioDemand
} from '../../../services/SlicanAudioService';
import { SlicanCentralSelectionService } from '../../../services/SlicanCentralSelectionService';
import { SlicanLicenseSelectionService } from '../../../services/SlicanLicenseSelectionService';

type LicenseItem = { warehouseStockId: number; quantity: number };

export interface SlicanAudioResolution {
  centralRecommendation: { warehouseStockId: number; modelName: string } | null;
  licenses: Array<{ type: string; items: LicenseItem[] }>;
  warnings: string[];
  bomItems: LicenseItem[];
}

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
    const central = await SlicanCentralSelectionService.selectCentral(demand, sipVoipSubscribers);
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

    const licenseResult = await SlicanLicenseSelectionService.resolveLicensesForDemand({
      sipVoipSubscribers,
      audioDevices: demand.audioIpDevices,
      ivrChannels: demand.ivrChannels,
      conferenceChannels: demand.conferenceChannels
    });
    const { licenses } = licenseResult;
    warnings.push(...licenseResult.warnings);

    for (const item of licenseResult.selected) {
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

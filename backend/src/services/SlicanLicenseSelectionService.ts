import { AppDataSource } from '../config/database';
import { SlicanLicenseSpecification } from '../entities/SlicanLicenseSpecification';
import {
  calculateLicensePackages,
  MissingLicensePackagesError
} from './SlicanAudioService';

export interface SlicanLicenseDemand {
  sipVoipSubscribers: number;
  audioDevices: number;
  ivrChannels: number;
  conferenceChannels: number;
}

type LicenseType = 'VOIP_SUBSCRIBER' | 'AUDIO' | 'IVR' | 'CONFERENCE';
type LicenseItem = { warehouseStockId: number; quantity: number };

const LICENSE_DEMAND_FIELD: Record<LicenseType, keyof SlicanLicenseDemand> = {
  VOIP_SUBSCRIBER: 'sipVoipSubscribers',
  AUDIO: 'audioDevices',
  IVR: 'ivrChannels',
  CONFERENCE: 'conferenceChannels'
};

const RESOLVER_DEMAND_FIELD: Record<LicenseType, string> = {
  VOIP_SUBSCRIBER: 'sipVoipSubscribers',
  AUDIO: 'audioDevices',
  IVR: 'ivrChannels',
  CONFERENCE: 'conferenceChannels'
};

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

export class SlicanLicenseSelectionService {
  private static async findActiveLicenses(types: LicenseType[]): Promise<SlicanLicenseSpecification[]> {
    if (types.length === 0) return [];
    const repo = AppDataSource.getRepository(SlicanLicenseSpecification);
    return repo.createQueryBuilder('sls')
      .where('sls.is_active = true')
      .andWhere('sls.license_type IN (:...types)', { types })
      .orderBy('sls.priority', 'ASC')
      .addOrderBy('sls.id', 'ASC')
      .addOrderBy('sls.package_size', 'DESC')
      .getMany();
  }

  static async selectLicensesForDemand(demand: SlicanLicenseDemand) {
    const types = (Object.keys(LICENSE_DEMAND_FIELD) as LicenseType[])
      .filter(type => demand[LICENSE_DEMAND_FIELD[type]] > 0);
    const available = await this.findActiveLicenses(types);
    const selected: { warehouseStockId: number; licenseType: string; packageSize: number; quantity: number }[] = [];
    const warnings: string[] = [];

    for (const type of types) {
      const count = demand[LICENSE_DEMAND_FIELD[type]];
      const licenses = available.filter(license => license.licenseType === type);
      if (licenses.length === 0) {
        warnings.push(`No active ${type} license configuration`);
        continue;
      }

      const bySize = new Map<number, SlicanLicenseSpecification>();
      for (const license of licenses) {
        if (!bySize.has(license.packageSize)) bySize.set(license.packageSize, license);
      }
      if ([100, 10, 1].some(size => !bySize.has(size))) {
        throw new MissingLicensePackagesError(`Missing active packages [100, 10, 1] for ${type}`);
      }
      for (const [size, quantity] of Object.entries(calculateLicensePackages(count))) {
        const license = bySize.get(Number(size))!;
        selected.push({
          warehouseStockId: license.warehouseStockId,
          licenseType: type,
          packageSize: Number(size),
          quantity
        });
      }
    }
    return { licenses: selected, warnings };
  }

  static async resolveLicensesForDemand(demand: SlicanLicenseDemand) {
    const types = Object.keys(LICENSE_DEMAND_FIELD) as LicenseType[];
    const available = await this.findActiveLicenses(types);
    const licenses: Array<{ type: string; items: LicenseItem[] }> = [];
    const warnings: string[] = [];
    const selected: LicenseItem[] = [];

    for (const type of types) {
      const output = { type, items: [] as LicenseItem[] };
      licenses.push(output);
      const active = available.filter(license => license.licenseType === type);
      const expectedField = RESOLVER_DEMAND_FIELD[type];
      const configuredField = active[0]?.demandField ?? expectedField;
      if (active.some(license => license.demandField !== configuredField) ||
          configuredField !== expectedField) {
        warnings.push(`Niejednoznaczna konfiguracja zapotrzebowania licencji ${type}.`);
        continue;
      }

      const requested = demand[LICENSE_DEMAND_FIELD[type]];
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
      selected.push(...output.items);
    }

    return { licenses, warnings, selected };
  }

  static async getAllLicenses(): Promise<SlicanLicenseSpecification[]> {
    const repo = AppDataSource.getRepository(SlicanLicenseSpecification);
    return repo.find({
      where: { isActive: true },
      relations: ['warehouseStock'],
      order: { priority: 'ASC', licenseType: 'ASC', packageSize: 'DESC' }
    });
  }

  static async getLicense(id: number): Promise<SlicanLicenseSpecification | null> {
    const repo = AppDataSource.getRepository(SlicanLicenseSpecification);
    return repo.findOne({ where: { id }, relations: ['warehouseStock'] });
  }
}

import { SlicanCentralSpecification } from '../entities/SlicanCentralSpecification';
import { SlicanLicenseSpecification } from '../entities/SlicanLicenseSpecification';

export interface SlicanAudioDemand {
  dphIpDevices: number;
  audioIpDevices: number;
  cts220IpDevices: number;
  ivrChannels: number;
  conferenceChannels: number;
}

export interface VoipMultipliers {
  dphIpMultiplier: number;
  audioIpMultiplier: number;
  cts220IpMultiplier: number;
}

export const defaultMultipliers: VoipMultipliers = {
  dphIpMultiplier: 1, audioIpMultiplier: 1, cts220IpMultiplier: 1
};

export function calculateVoipSubscribers(demand: SlicanAudioDemand, formula: VoipMultipliers): number {
  return Math.ceil(
    demand.dphIpDevices * Number(formula.dphIpMultiplier) +
    demand.audioIpDevices * Number(formula.audioIpMultiplier) +
    demand.cts220IpDevices * Number(formula.cts220IpMultiplier)
  );
}

export function calculateLicensePackages(demand: number): Record<number, number> {
  if (!Number.isSafeInteger(demand) || demand < 0) throw new Error('Invalid license demand');
  const packages: Record<number, number> = {};
  let remaining = demand;
  for (const size of [100, 10, 1]) {
    const qty = Math.floor(remaining / size);
    const rest = remaining % size;
    const rounded = size !== 1 && rest >= size - 1;
    if (qty + Number(rounded) > 0) packages[size] = qty + Number(rounded);
    remaining = rounded ? 0 : rest;
  }
  return packages;
}

/**
 * @deprecated Use SlicanCentralSelectionService.selectCentral() instead.
 * Kept temporarily for backward compatibility. Will be removed in a follow-up PR
 * once confirmed no other call sites remain (search codebase for `selectCentral(`).
 */
export function selectCentral(centrals: SlicanCentralSpecification[], demand: SlicanAudioDemand, sipVoipSubscribers: number) {
  return centrals
    .filter(c => c.isActive &&
      sipVoipSubscribers <= c.maxSipVoipSubscribers &&
      demand.dphIpDevices <= c.maxDphIpDevices &&
      demand.audioIpDevices <= c.maxAudioIpDevices &&
      demand.ivrChannels <= c.maxIvrChannels &&
      demand.conferenceChannels <= c.maxConferenceChannels)
    .sort((a, b) => a.priority - b.priority || a.maxSipVoipSubscribers - b.maxSipVoipSubscribers || a.id - b.id)[0] ?? null;
}

const licenseFields: Record<string, 'sipVoipSubscribers' | 'audioDevices' | 'ivrChannels' | 'conferenceChannels'> = {
  VOIP_SUBSCRIBER: 'sipVoipSubscribers',
  AUDIO: 'audioDevices',
  IVR: 'ivrChannels',
  CONFERENCE: 'conferenceChannels'
};

export class MissingLicensePackagesError extends Error {}

/**
 * @deprecated Use SlicanLicenseSelectionService.selectLicensesForDemand() instead.
 * Kept temporarily for backward compatibility. Will be removed in a follow-up PR
 * once confirmed no other call sites remain (search codebase for `selectLicenses(`).
 */
export function selectLicenses(
  licenses: SlicanLicenseSpecification[],
  demand: { sipVoipSubscribers: number; audioDevices: number; ivrChannels: number; conferenceChannels: number }
) {
  const selected: { warehouseStockId: number; licenseType: string; packageSize: number; quantity: number }[] = [];
  const warnings: string[] = [];
  for (const [type, field] of Object.entries(licenseFields)) {
    const count = demand[field];
    if (!count) continue;
    const available = licenses.filter(l => l.isActive && l.licenseType === type);
    if (!available.length) {
      warnings.push(`No active ${type} license configuration`);
      continue;
    }
    const bySize = new Map(available.map(l => [l.packageSize, l]));
    if ([100, 10, 1].some(size => !bySize.has(size))) {
      throw new MissingLicensePackagesError(`Missing active packages [100, 10, 1] for ${type}`);
    }
    for (const [size, quantity] of Object.entries(calculateLicensePackages(count))) {
      const license = bySize.get(Number(size))!;
      selected.push({ warehouseStockId: license.warehouseStockId, licenseType: type, packageSize: Number(size), quantity });
    }
  }
  return { licenses: selected, warnings };
}

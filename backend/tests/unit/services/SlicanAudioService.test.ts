import {
  calculateLicensePackages, calculateVoipSubscribers, defaultMultipliers,
  selectCentral, selectLicenses, MissingLicensePackagesError
} from '../../../src/services/SlicanAudioService';
import { SlicanCentralSpecification } from '../../../src/entities/SlicanCentralSpecification';
import { SlicanLicenseSpecification } from '../../../src/entities/SlicanLicenseSpecification';

const demand = { dphIpDevices: 4, audioIpDevices: 6, cts220IpDevices: 2, ivrChannels: 1, conferenceChannels: 4 };

describe('Slican audio selection', () => {
  test.each([
    [12, { 10: 1, 1: 2 }],
    [89, { 10: 9 }],
    [901, { 100: 9, 1: 1 }],
    [912, { 100: 9, 10: 1, 1: 2 }],
    [9, { 10: 1 }],
    [99, { 100: 1 }],
    [999, { 100: 10 }],
    [9999, { 100: 100 }],
    [0, {}]
  ])('packs demand %i', (count, expected) => {
    expect(calculateLicensePackages(count)).toEqual(expected);
  });

  it('rejects fractional or negative package demand', () => {
    expect(() => calculateLicensePackages(1.5)).toThrow();
    expect(() => calculateLicensePackages(-1)).toThrow();
  });

  it('calculates subscribers with editable multipliers, rounding up fractional subscriptions', () => {
    expect(calculateVoipSubscribers(demand, defaultMultipliers)).toBe(12);
    expect(calculateVoipSubscribers(demand, {
      dphIpMultiplier: 2, audioIpMultiplier: 0.5, cts220IpMultiplier: 1.25
    })).toBe(14);
  });

  it('checks all five limits and active status, then priority', () => {
    const central = {
      id: 1, priority: 10, isActive: true, maxSipVoipSubscribers: 12,
      maxDphIpDevices: 4, maxAudioIpDevices: 6, maxIvrChannels: 1, maxConferenceChannels: 4
    } as SlicanCentralSpecification;
    const preferred = { ...central, id: 2, priority: 1 };
    expect(selectCentral([central, preferred], demand, 12)?.id).toBe(2);
    for (const key of ['maxSipVoipSubscribers', 'maxDphIpDevices', 'maxAudioIpDevices',
      'maxIvrChannels', 'maxConferenceChannels'] as const) {
      expect(selectCentral([{ ...central, [key]: 0 }], demand, 12)).toBeNull();
    }
    expect(selectCentral([{ ...central, isActive: false }], demand, 12)).toBeNull();
  });

  it('selects independent active license packages and warns on unconfigured types', () => {
    const licenses = [100, 10, 1].map(size => ({
      warehouseStockId: size, licenseType: 'VOIP_SUBSCRIBER', packageSize: size,
      isActive: true, demandField: 'sipVoipSubscribers'
    })) as SlicanLicenseSpecification[];
    const result = selectLicenses(licenses, {
      sipVoipSubscribers: 12, audioDevices: 6, ivrChannels: 0, conferenceChannels: 0
    });
    expect(result.licenses).toEqual([
      { warehouseStockId: 1, licenseType: 'VOIP_SUBSCRIBER', packageSize: 1, quantity: 2 },
      { warehouseStockId: 10, licenseType: 'VOIP_SUBSCRIBER', packageSize: 10, quantity: 1 }
    ]);
    expect(result.warnings).toContain('No active AUDIO license configuration');
    expect(() => selectLicenses(licenses.slice(1), {
      sipVoipSubscribers: 12, audioDevices: 0, ivrChannels: 0, conferenceChannels: 0
    })).toThrow(MissingLicensePackagesError);
  });
});

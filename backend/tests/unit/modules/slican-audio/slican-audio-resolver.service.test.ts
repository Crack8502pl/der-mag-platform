import { AppDataSource } from '../../../../src/config/database';
import { SlicanCentralSpecification } from '../../../../src/entities/SlicanCentralSpecification';
import { SlicanLicenseSpecification } from '../../../../src/entities/SlicanLicenseSpecification';
import { SlicanVoipSubscriberFormula } from '../../../../src/entities/SlicanVoipSubscriberFormula';
import { SlicanAudioResolverService } from '../../../../src/modules/slican-audio/services/slican-audio-resolver.service';
import { createMockQueryBuilder } from '../../../mocks/database.mock';

jest.mock('../../../../src/config/database', () => ({
  AppDataSource: { getRepository: jest.fn() }
}));

const demand = {
  dphIpDevices: 2,
  audioIpDevices: 9,
  cts220IpDevices: 1,
  ivrChannels: 9,
  conferenceChannels: 2
};

describe('SlicanAudioResolverService', () => {
  let centrals: any[];
  let licenses: any[];
  let formula: any;
  let centralQueryBuilder: any;
  let licenseQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();
    centrals = [{
      warehouseStockId: 50,
      modelName: 'NCP-CM300P',
      priority: 10,
      isActive: true,
      maxSipVoipSubscribers: 12,
      maxDphIpDevices: 2,
      maxAudioIpDevices: 9,
      maxIvrChannels: 9,
      maxConferenceChannels: 2
    }, {
      warehouseStockId: 51,
      modelName: 'NCP-CM400P',
      priority: 20,
      isActive: true,
      maxSipVoipSubscribers: 100,
      maxDphIpDevices: 100,
      maxAudioIpDevices: 100,
      maxIvrChannels: 100,
      maxConferenceChannels: 100
    }];
    licenses = [];
    for (const [type, demandField] of [
      ['VOIP_SUBSCRIBER', 'sipVoipSubscribers'],
      ['AUDIO', 'audioDevices'],
      ['IVR', 'ivrChannels'],
      ['CONFERENCE', 'conferenceChannels']
    ]) {
      for (const packageSize of [100, 10, 1]) {
        licenses.push({
          warehouseStockId: licenses.length + 100,
          licenseType: type,
          demandField,
          packageSize,
          isActive: true
        });
      }
    }
    formula = {
      id: 1,
      dphIpMultiplier: 1,
      audioIpMultiplier: 1,
      cts220IpMultiplier: 1
    };
    centralQueryBuilder = createMockQueryBuilder<SlicanCentralSpecification>();
    centralQueryBuilder.getOne.mockImplementation(async () =>
      centrals.filter(central =>
        central.isActive &&
        central.maxSipVoipSubscribers >= 12 &&
        central.maxDphIpDevices >= demand.dphIpDevices &&
        central.maxAudioIpDevices >= demand.audioIpDevices &&
        central.maxIvrChannels >= demand.ivrChannels &&
        central.maxConferenceChannels >= demand.conferenceChannels
      ).sort((a, b) =>
        a.priority - b.priority ||
        a.maxSipVoipSubscribers - b.maxSipVoipSubscribers ||
        a.id - b.id
      )[0] ?? null
    );
    licenseQueryBuilder = createMockQueryBuilder<SlicanLicenseSpecification>();
    licenseQueryBuilder.getMany.mockImplementation(async () =>
      licenses.filter(license => license.isActive)
    );
    (AppDataSource.getRepository as jest.Mock).mockImplementation(entity => ({
      find: async () => entity === SlicanCentralSpecification ? centrals : licenses,
      findOneBy: async () => entity === SlicanVoipSubscriberFormula ? formula : null,
      createQueryBuilder: () => entity === SlicanCentralSpecification ? centralQueryBuilder : licenseQueryBuilder
    }));
  });

  it('selects the priority central and maps all license types using demand and configured packages', async () => {
    const result = await new SlicanAudioResolverService().resolveForSmokA(demand);

    expect(result.centralRecommendation).toEqual({
      warehouseStockId: 50,
      modelName: 'NCP-CM300P'
    });
    expect(result.licenses).toEqual([
      { type: 'VOIP_SUBSCRIBER', items: [{ warehouseStockId: 102, quantity: 2 }, { warehouseStockId: 101, quantity: 1 }] },
      { type: 'AUDIO', items: [{ warehouseStockId: 104, quantity: 1 }] },
      { type: 'IVR', items: [{ warehouseStockId: 107, quantity: 1 }] },
      { type: 'CONFERENCE', items: [{ warehouseStockId: 111, quantity: 2 }] }
    ]);
    expect(result.bomItems.find(item => item.warehouseStockId === 50)?.quantity).toBe(1);
    expect(result.bomItems.find(item => item.warehouseStockId === 51)?.quantity).toBe(0);
    expect(result.warnings).toEqual([]);
  });

  it('returns no central or license recommendation for an all-zero demand', async () => {
    const result = await new SlicanAudioResolverService().resolveForSmokA({
      dphIpDevices: 0,
      audioIpDevices: 0,
      cts220IpDevices: 0,
      ivrChannels: 0,
      conferenceChannels: 0
    });

    expect(result.centralRecommendation).toBeNull();
    expect(result.licenses).toEqual([]);
    expect(result.bomItems.every(item => item.quantity === 0)).toBe(true);
  });

  it('warns rather than selecting an inactive central or incomplete license configuration', async () => {
    centrals = [{ ...centrals[0], isActive: false }];
    const noCentral = await new SlicanAudioResolverService().resolveForSmokA(demand);
    expect(noCentral.centralRecommendation).toBeNull();
    expect(noCentral.warnings).toContain('Brak aktywnych central Slican audio.');

    centrals = [{ ...centrals[0], isActive: true }];
    licenses = licenses.filter(license => license.licenseType !== 'AUDIO' || license.packageSize !== 1);
    const incomplete = await new SlicanAudioResolverService().resolveForSmokA(demand);
    expect(incomplete.warnings).toContain('Brakuje pakietu rozmiaru 1 dla AUDIO.');
    expect(incomplete.licenses.find(license => license.type === 'AUDIO')?.items).toEqual([]);
  });

  it('warns on ambiguous active package sizes and rejects invalid demand', async () => {
    licenses.push({ ...licenses[0], warehouseStockId: 999 });
    const result = await new SlicanAudioResolverService().resolveForSmokA(demand);
    expect(result.warnings).toContain('Niejednoznaczna konfiguracja pakietów licencji VOIP_SUBSCRIBER.');
    await expect(new SlicanAudioResolverService().resolveForSmokA({
      ...demand,
      audioIpDevices: -1
    })).rejects.toThrow(RangeError);
  });
});

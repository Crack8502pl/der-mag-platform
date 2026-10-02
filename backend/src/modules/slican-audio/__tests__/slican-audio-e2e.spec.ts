import express from 'express';
import request from 'supertest';
import { AppDataSource } from '../../../config/database';
import { SlicanCentralSpecification } from '../../../entities/SlicanCentralSpecification';
import { SlicanLicenseSpecification } from '../../../entities/SlicanLicenseSpecification';
import { SlicanVoipSubscriberFormula } from '../../../entities/SlicanVoipSubscriberFormula';
import { User } from '../../../entities/User';
import aggregationRoutes from '../routes/smoka-audio-aggregation.routes';
import resolverRoutes from '../routes/slican-audio-resolver.routes';

jest.mock('../../../config/database', () => ({
  AppDataSource: { getRepository: jest.fn() }
}));
jest.mock('../../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.userId = 1;
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/smoka/audio', aggregationRoutes);
app.use('/api/slican-audio', resolverRoutes);

function centralQueryBuilder(items: any[]) {
  const queryBuilder: any = {};
  const parameters: Record<string, number> = {};
  queryBuilder.leftJoinAndSelect = jest.fn(() => queryBuilder);
  queryBuilder.where = jest.fn(() => queryBuilder);
  queryBuilder.andWhere = jest.fn((_condition: string, values?: Record<string, number>) => {
    Object.assign(parameters, values);
    return queryBuilder;
  });
  queryBuilder.orderBy = jest.fn(() => queryBuilder);
  queryBuilder.addOrderBy = jest.fn(() => queryBuilder);
  queryBuilder.getOne = jest.fn();
  queryBuilder.getOne.mockImplementation(async () => items
    .filter(item => item.isActive &&
      item.maxSipVoipSubscribers >= parameters.sipVoipSubscribers &&
      item.maxDphIpDevices >= parameters.dphIpDevices &&
      item.maxAudioIpDevices >= parameters.audioIpDevices &&
      item.maxIvrChannels >= parameters.ivrChannels &&
      item.maxConferenceChannels >= parameters.conferenceChannels)
    .sort((a, b) => a.priority - b.priority ||
      a.maxSipVoipSubscribers - b.maxSipVoipSubscribers || a.id - b.id)[0] ?? null);
  return queryBuilder;
}

function licenseQueryBuilder(items: any[]) {
  const queryBuilder: any = {};
  let types: string[] = [];
  queryBuilder.where = jest.fn(() => queryBuilder);
  queryBuilder.andWhere = jest.fn((_condition: string, values?: { types?: string[] }) => {
    types = values?.types ?? [];
    return queryBuilder;
  });
  queryBuilder.orderBy = jest.fn(() => queryBuilder);
  queryBuilder.addOrderBy = jest.fn(() => queryBuilder);
  queryBuilder.getMany = jest.fn();
  queryBuilder.getMany.mockImplementation(async () => items
    .filter(item => item.isActive && types.includes(item.licenseType)));
  return queryBuilder;
}

describe('Slican audio end-to-end', () => {
  const central = {
    id: 1,
    warehouseStockId: 100,
    modelName: 'NCP-CM300P.BC',
    priority: 1,
    isActive: true,
    maxSipVoipSubscribers: 200,
    maxDphIpDevices: 10,
    maxAudioIpDevices: 10,
    maxIvrChannels: 10,
    maxConferenceChannels: 40
  };
  const secondaryCentral = {
    ...central,
    id: 2,
    warehouseStockId: 101,
    modelName: 'NCP-CM400P.BC',
    priority: 20
  };
  const licenses = [
    ['VOIP_SUBSCRIBER', 'sipVoipSubscribers'],
    ['AUDIO', 'audioDevices'],
    ['IVR', 'ivrChannels'],
    ['CONFERENCE', 'conferenceChannels']
  ].flatMap(([licenseType, demandField], typeIndex) =>
    [100, 10, 1].map((packageSize, packageIndex) => ({
      warehouseStockId: 200 + typeIndex * 10 + packageIndex,
      licenseType,
      demandField,
      packageSize,
      isActive: true
    }))
  );

  beforeEach(() => {
    (AppDataSource.getRepository as jest.Mock).mockImplementation(entity => {
      if (entity === User) {
        return { findOne: async () => ({ role: { permissions: { all: true } } }) };
      }
      return {
        find: async () => entity === SlicanCentralSpecification ? [central, secondaryCentral] : licenses,
        createQueryBuilder: () => entity === SlicanCentralSpecification
          ? centralQueryBuilder([central, secondaryCentral])
          : licenseQueryBuilder(licenses),
        findOneBy: async () => entity === SlicanVoipSubscriberFormula
          ? { id: 1, dphIpMultiplier: 1, audioIpMultiplier: 1, cts220IpMultiplier: 1 }
          : null
      };
    });
  });

  it('aggregates two crossings and a signal box, resolves all BOM categories, and propagates hierarchy edits', async () => {
    const hierarchy = [
      { id: 'lcs-1', type: 'LCS', items: [] },
      {
        id: 'nastawnia-1',
        type: 'Nastawnia',
        parentId: 'lcs-1',
        ownerId: 'lcs-1',
        items: [{ id: 'audio-1', deviceType: 'AUDIO_IP', quantity: 1 }]
      },
      {
        id: 'przejazd-1',
        type: 'Przejazd',
        parentId: 'nastawnia-1',
        ownerId: 'lcs-1',
        items: [
          { id: 'dph-1', deviceType: 'DPH_IP', quantity: 1 },
          { id: 'audio-1', deviceType: 'AUDIO_IP', quantity: 1 },
          { deviceType: 'CTS220_IP', quantity: 1 },
          { deviceType: 'IVR', quantity: 1 },
          { deviceType: 'CONFERENCE', quantity: 2 }
        ]
      },
      {
        id: 'przejazd-2',
        type: 'Przejazd',
        parentId: 'lcs-1',
        ownerId: 'lcs-1',
        items: [
          { id: 'dph-2', deviceType: 'DPH_IP', quantity: 1 },
          { deviceType: 'IVR', quantity: 1 },
          { deviceType: 'CONFERENCE', quantity: 2 }
        ]
      }
    ];

    const aggregated = await request(app)
      .post('/api/smoka/audio/aggregate')
      .send({ ownerId: 'lcs-1', nodes: hierarchy });
    expect(aggregated.status).toBe(200);
    expect(aggregated.body.aggregate).toEqual({
      dphIpDevices: 2,
      audioIpDevices: 1,
      cts220IpDevices: 1,
      ivrChannels: 2,
      conferenceChannels: 4
    });
    expect(aggregated.body.warnings).toContain(
      'Urządzenie audio audio-1 występuje pod różnymi rodzicami; zliczono je tylko raz.'
    );

    const resolve = async (demand: object) =>
      request(app).post('/api/slican-audio/resolve').send(demand);
    const resolved = await resolve(aggregated.body.aggregate);
    expect(resolved.status).toBe(200);
    expect(resolved.body.centralRecommendation).toEqual({
      warehouseStockId: 100,
      modelName: 'NCP-CM300P.BC'
    });
    expect(resolved.body.licenses.map((license: { type: string }) => license.type)).toEqual([
      'VOIP_SUBSCRIBER', 'AUDIO', 'IVR', 'CONFERENCE'
    ]);
    expect(resolved.body.licenses.every((license: { items: unknown[] }) => license.items.length > 0)).toBe(true);
    expect(resolved.body.warnings).toEqual([]);
    expect(resolved.body.bomItems).toHaveLength(14);
    expect(resolved.body.bomItems.find((item: { warehouseStockId: number }) =>
      item.warehouseStockId === central.warehouseStockId
    ).quantity).toBe(1);
    expect(resolved.body.bomItems.some((item: { warehouseStockId: number; quantity: number }) =>
      item.warehouseStockId === secondaryCentral.warehouseStockId && item.quantity > 0
    )).toBe(false);
    for (const license of resolved.body.licenses) {
      expect(license.items.every((selected: { warehouseStockId: number; quantity: number }) =>
        resolved.body.bomItems.find((item: { warehouseStockId: number }) =>
          item.warehouseStockId === selected.warehouseStockId
        ).quantity === selected.quantity
      )).toBe(true);
    }

    const edited = await request(app)
      .post('/api/smoka/audio/aggregate')
      .send({
        ownerId: 'lcs-1',
        nodes: hierarchy.map(node => node.id === 'przejazd-2'
          ? { ...node, items: [...node.items, { id: 'audio-2', deviceType: 'AUDIO_IP', quantity: 1 }] }
          : node)
      });
    expect(edited.body.aggregate.audioIpDevices).toBe(2);
    const updatedResolution = await resolve(edited.body.aggregate);
    expect(updatedResolution.body.licenses.find(
      (license: { type: string }) => license.type === 'VOIP_SUBSCRIBER'
    ).items[0].quantity).toBe(5);
  });

  it('keeps camera and legacy/non-audio inputs outside audio demand', async () => {
    const aggregate = await request(app)
      .post('/api/smoka/audio/aggregate')
      .send({
        ownerId: 'lcs-1',
        cameraCount: 999,
        recorderCount: 8,
        nodes: [{ id: 'lcs-1', type: 'LCS', items: [] }]
      });
    expect(aggregate.body.aggregate).toEqual({
      dphIpDevices: 0,
      audioIpDevices: 0,
      cts220IpDevices: 0,
      ivrChannels: 0,
      conferenceChannels: 0
    });
    expect(aggregate.body.aggregate).not.toHaveProperty('cameraCount');
  });

  it('warns rather than failing when a package is missing', async () => {
    (AppDataSource.getRepository as jest.Mock).mockImplementation(entity => {
      if (entity === User) {
        return { findOne: async () => ({ role: { permissions: { all: true } } }) };
      }
      return {
        find: async () => entity === SlicanCentralSpecification ? [central, secondaryCentral] : licenses.filter(
          license => !(license.licenseType === 'IVR' && license.packageSize === 1)
        ),
        createQueryBuilder: () => entity === SlicanCentralSpecification
          ? centralQueryBuilder([central, secondaryCentral])
          : licenseQueryBuilder(licenses.filter(
            license => !(license.licenseType === 'IVR' && license.packageSize === 1)
          )),
        findOneBy: async () => entity === SlicanVoipSubscriberFormula
          ? { id: 1, dphIpMultiplier: 1, audioIpMultiplier: 1, cts220IpMultiplier: 1 }
          : null
      };
    });

    const result = await request(app).post('/api/slican-audio/resolve').send({
      dphIpDevices: 0,
      audioIpDevices: 0,
      cts220IpDevices: 0,
      ivrChannels: 1,
      conferenceChannels: 0
    });
    expect(result.status).toBe(200);
    expect(result.body.warnings).toContain('Brakuje pakietu rozmiaru 1 dla IVR.');
  });
});

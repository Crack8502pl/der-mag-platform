import express from 'express';
import request from 'supertest';
import { AppDataSource } from '../../../../src/config/database';
import { User } from '../../../../src/entities/User';
import { SlicanCentralSpecification } from '../../../../src/entities/SlicanCentralSpecification';
import { SlicanLicenseSpecification } from '../../../../src/entities/SlicanLicenseSpecification';
import { SlicanVoipSubscriberFormula } from '../../../../src/entities/SlicanVoipSubscriberFormula';
import resolverRoutes from '../../../../src/modules/slican-audio/routes/slican-audio-resolver.routes';
import aggregationRoutes from '../../../../src/modules/slican-audio/routes/smoka-audio-aggregation.routes';
import { createMockQueryBuilder } from '../../../mocks/database.mock';

jest.mock('../../../../src/config/database', () => ({
  AppDataSource: { getRepository: jest.fn() }
}));
jest.mock('../../../../src/middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.userId = 1;
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/slican-audio-resolver', resolverRoutes);
app.use('/slican-audio', resolverRoutes);
app.use('/smoka/audio', aggregationRoutes);

function centralQueryBuilder(items: any[]) {
  const queryBuilder = createMockQueryBuilder<any>();
  const parameters: Record<string, number> = {};
  queryBuilder.andWhere.mockImplementation((_condition, values) => {
    Object.assign(parameters, values);
    return queryBuilder;
  });
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
  const queryBuilder = createMockQueryBuilder<any>();
  let types: string[] = [];
  queryBuilder.andWhere.mockImplementation((_condition, values) => {
    types = values?.types ?? [];
    return queryBuilder;
  });
  queryBuilder.getMany.mockImplementation(async () => items
    .filter(item => item.isActive && types.includes(item.licenseType)));
  return queryBuilder;
}

describe('Slican audio resolver endpoint', () => {
  let canRead: boolean;

  beforeEach(() => {
    canRead = true;
    (AppDataSource.getRepository as jest.Mock).mockImplementation(entity => {
      if (entity === User) {
        return { findOne: async () => ({ role: { permissions: { bom: { read: canRead } } } }) };
      }
      if (entity === SlicanCentralSpecification) {
        return {
          find: async () => [{
            warehouseStockId: 10,
            modelName: 'NCP-CM300P',
            priority: 1,
            isActive: true,
            maxSipVoipSubscribers: 20,
            maxDphIpDevices: 10,
            maxAudioIpDevices: 10,
            maxIvrChannels: 10,
            maxConferenceChannels: 10
          }],
          createQueryBuilder: () => centralQueryBuilder([{
            warehouseStockId: 10,
            modelName: 'NCP-CM300P',
            priority: 1,
            isActive: true,
            maxSipVoipSubscribers: 20,
            maxDphIpDevices: 10,
            maxAudioIpDevices: 10,
            maxIvrChannels: 10,
            maxConferenceChannels: 10
          }])
        };
      }
      if (entity === SlicanVoipSubscriberFormula) {
        return { findOneBy: async () => null };
      }
      return {
        find: async () => [],
        createQueryBuilder: () => licenseQueryBuilder([])
      };
    });
  });

  it('resolves explicit audio demand and guards the endpoint by BOM read permission', async () => {
    const demand = {
      dphIpDevices: 1,
      audioIpDevices: 0,
      cts220IpDevices: 0,
      ivrChannels: 0,
      conferenceChannels: 0
    };
    const result = await request(app).post('/slican-audio-resolver/resolve').send(demand);
    expect(result.status).toBe(200);
    expect(result.body.centralRecommendation).toEqual({
      warehouseStockId: 10,
      modelName: 'NCP-CM300P'
    });
    expect(result.body.bomItems).toContainEqual({ warehouseStockId: 10, quantity: 1 });
    expect((await request(app).post('/slican-audio/resolve').send(demand)).status).toBe(200);

    expect((await request(app).post('/slican-audio-resolver/resolve').send({
      ...demand,
      unexpected: 1
    })).status).toBe(400);
    canRead = false;
    expect((await request(app).post('/slican-audio-resolver/resolve').send(demand)).status).toBe(403);
  });

  it('aggregates validated owner hierarchy through the SMOK-A audio endpoint', async () => {
    canRead = true;
    const result = await request(app).post('/smoka/audio/aggregate').send({
      ownerId: 'lcs',
      nodes: [
        { id: 'lcs', type: 'LCS', items: [{ id: 'dph-1', deviceType: 'DPH_IP', quantity: 1 }] },
        { id: 'crossing', type: 'Przejazd', ownerId: 'lcs', items: [{ id: 'dph-1', deviceType: 'DPH_IP', quantity: 1 }] }
      ]
    });
    expect(result.status).toBe(200);
    expect(result.body.aggregate.dphIpDevices).toBe(1);
    expect(result.body.warnings).toHaveLength(1);

    expect((await request(app).post('/smoka/audio/aggregate').send({
      ownerId: 'lcs',
      nodes: [{ id: 'lcs', type: 'LCS', items: [{ deviceType: 'DPH_IP', quantity: -1 }] }]
    })).status).toBe(400);
  });
});

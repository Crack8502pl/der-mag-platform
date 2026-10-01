import express from 'express';
import request from 'supertest';
import { AppDataSource } from '../../../../src/config/database';
import { User } from '../../../../src/entities/User';
import { SlicanCentralSpecification } from '../../../../src/entities/SlicanCentralSpecification';
import { SlicanLicenseSpecification } from '../../../../src/entities/SlicanLicenseSpecification';
import { SlicanVoipSubscriberFormula } from '../../../../src/entities/SlicanVoipSubscriberFormula';
import resolverRoutes from '../../../../src/modules/slican-audio/routes/slican-audio-resolver.routes';

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
          }]
        };
      }
      if (entity === SlicanVoipSubscriberFormula) {
        return { findOneBy: async () => null };
      }
      return { find: async () => [] };
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

    expect((await request(app).post('/slican-audio-resolver/resolve').send({
      ...demand,
      unexpected: 1
    })).status).toBe(400);
    canRead = false;
    expect((await request(app).post('/slican-audio-resolver/resolve').send(demand)).status).toBe(403);
  });
});

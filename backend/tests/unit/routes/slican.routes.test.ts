import express from 'express';
import request from 'supertest';
import { AppDataSource } from '../../../src/config/database';
import { slicanCentralRoutes, slicanLicenseRoutes, slicanFormulaRoutes } from '../../../src/routes/slican.routes';
import { User } from '../../../src/entities/User';
import { WarehouseStock } from '../../../src/entities/WarehouseStock';
import { SlicanCentralSpecification } from '../../../src/entities/SlicanCentralSpecification';
import { SlicanLicenseSpecification } from '../../../src/entities/SlicanLicenseSpecification';
import { SlicanVoipSubscriberFormula } from '../../../src/entities/SlicanVoipSubscriberFormula';

jest.mock('../../../src/config/database', () => ({ AppDataSource: { getRepository: jest.fn() } }));
jest.mock('../../../src/middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.userId = 1; next(); }
}));

const app = express();
app.use(express.json());
app.use('/central', slicanCentralRoutes);
app.use('/license', slicanLicenseRoutes);
app.use('/formula', slicanFormulaRoutes);

const central = {
  warehouseStockId: 1, modelName: 'NCP-CM300P.BC',
  maxSipVoipSubscribers: 200, maxDphIpDevices: 10, maxAudioIpDevices: 10,
  maxIvrChannels: 2, maxConferenceChannels: 40, isActive: true, priority: 10
};
const query = encodeURIComponent(JSON.stringify({ dphIp: 4, audioIp: 6, cts220Ip: 2, ivr: 1, conf: 4 }));

describe('Slican configuration API', () => {
  let allowed: Record<string, boolean>;
  let rows: Record<string, any[]>;

  beforeEach(() => {
    allowed = { read: true, create: true, update: true, delete: true };
    rows = { SlicanCentralSpecification: [], SlicanLicenseSpecification: [], SlicanVoipSubscriberFormula: [] };
    (AppDataSource.getRepository as jest.Mock).mockImplementation(entity => {
      if (entity === User) return {
        findOne: async () => ({ role: { permissions: { bom: allowed } } })
      };
      if (entity === WarehouseStock) return {
        findOneBy: async ({ id }: { id: number }) => id >= 1 && id <= 20 ? { id } : null
      };
      const name = entity === SlicanCentralSpecification ? 'SlicanCentralSpecification'
        : entity === SlicanLicenseSpecification ? 'SlicanLicenseSpecification'
          : entity === SlicanVoipSubscriberFormula ? 'SlicanVoipSubscriberFormula' : '';
      const items = rows[name];
      return {
        find: async () => items,
        findOneBy: async (where: Record<string, any>) =>
          items.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null,
        create: (data: any) => ({ isActive: true, priority: 10, ...data }),
        save: async (data: any) => {
          if (!data.id) data.id = name === 'SlicanVoipSubscriberFormula' ? 1 : items.length + 1;
          if (name === 'SlicanLicenseSpecification' && data.isActive !== false &&
              items.some(row => row.id !== data.id && row.isActive !== false &&
                row.licenseType === data.licenseType && row.packageSize === data.packageSize))
            throw { code: '23505' };
          const index = items.findIndex(row => row.id === data.id);
          if (index < 0) items.push(data);
          else items[index] = data;
          return data;
        },
        delete: async (id: number) => {
          const index = items.findIndex(row => row.id === id);
          if (index !== -1) items.splice(index, 1);
          return { affected: index === -1 ? 0 : 1 };
        }
      };
    });
  });

  it('creates, reads, updates and deletes a central without deleting the stock', async () => {
    expect((await request(app).post('/central').send(central)).status).toBe(201);
    expect((await request(app).get('/central')).body.data).toHaveLength(1);
    expect((await request(app).get('/central/1')).body.data.warehouseStockId).toBe(1);
    expect((await request(app).put('/central/1').send({ maxIvrChannels: 5 })).body.data.maxIvrChannels).toBe(5);
    expect((await request(app).delete('/central/1')).status).toBe(200);
    expect((await request(app).get('/central/1')).status).toBe(404);
    expect((await AppDataSource.getRepository(WarehouseStock).findOneBy({ id: 1 }))).toEqual({ id: 1 });
  });

  it('rejects invalid fields, duplicate stock and role conflicts', async () => {
    expect((await request(app).post('/central').send({ ...central, maxDphIpDevices: -1 })).status).toBe(400);
    expect((await request(app).post('/central').send({ ...central, warehouseStockId: 21 })).status).toBe(404);
    await request(app).post('/central').send(central);
    expect((await request(app).post('/central').send(central)).status).toBe(409);
    expect((await request(app).post('/license').send({
      warehouseStockId: 1, licenseType: 'IVR', packageSize: 1, demandField: 'ivrChannels'
    })).status).toBe(409);
    expect((await request(app).put('/central/1').send({ maxIvrChannels: 'many' })).status).toBe(400);
    expect((await request(app).post('/license').send({
      warehouseStockId: 2, licenseType: 'IVR', packageSize: 3, demandField: 'ivrChannels'
    })).status).toBe(400);
    expect((await request(app).post('/license').send({
      warehouseStockId: 2, licenseType: 'IVR', packageSize: 1, demandField: 'audioDevices'
    })).status).toBe(400);
  });

  it('enforces BOM permissions', async () => {
    allowed = { read: true, create: false, update: false, delete: false };
    expect((await request(app).post('/central').send(central)).status).toBe(403);
    expect((await request(app).post('/license').send({})).status).toBe(403);
    expect((await request(app).put('/formula').send({ dphIpMultiplier: 2 })).status).toBe(403);
    expect((await request(app).delete('/central/1')).status).toBe(403);
  });

  it('handles license CRUD, singleton formula and full selection flow', async () => {
    await request(app).post('/central').send(central);
    for (const size of [100, 10, 1]) {
      expect((await request(app).post('/license').send({
        warehouseStockId: size === 100 ? 2 : size === 10 ? 3 : 4,
        licenseType: 'VOIP_SUBSCRIBER', packageSize: size, demandField: 'sipVoipSubscribers'
      })).status).toBe(201);
    }
    expect((await request(app).get('/license/1')).body.data.packageSize).toBe(100);
    expect((await request(app).put('/license/1').send({ priority: 2 })).body.data.priority).toBe(2);
    expect((await request(app).get('/license')).body.data).toHaveLength(3);
    expect((await request(app).get('/formula')).body.data.dphIpMultiplier).toBe(1);
    expect((await request(app).put('/formula').send({ dphIpMultiplier: 2 })).body.data.dphIpMultiplier).toBe(2);
    expect((await request(app).put('/formula').send({ dphIpMultiplier: -1 })).status).toBe(400);
    expect((await request(app).put('/formula').send({ dphIpMultiplier: 0.29 })).status).toBe(200);
    expect((await request(app).put('/formula').send({ dphIpMultiplier: 2 })).status).toBe(200);
    const result = await request(app).get(`/central/select?demand=${query}`);
    expect(result.status).toBe(200);
    expect(result.body.sipVoipSubscribers).toBe(16);
    expect(result.body.central.warehouseStockId).toBe(1);
    expect(result.body.licenses.map((item: any) => item.quantity)).toEqual([6, 1]);
    expect(result.body.warnings).toContain('No active AUDIO license configuration');
    expect((await request(app).delete('/license/1')).status).toBe(200);
    expect((await request(app).get(`/central/select?demand=${query}`)).status).toBe(422);
  });

  it('warns when no central fits, and rejects malformed demand', async () => {
    await request(app).post('/central').send({ ...central, maxAudioIpDevices: 5 });
    const result = await request(app).get(`/central/select?demand=${query}`);
    expect(result.status).toBe(200);
    expect(result.body.central).toBeNull();
    expect(result.body.warnings).toContain('No central fits demand');
    expect((await request(app).get('/central/select?demand=%7Bbad')).status).toBe(400);
  });
});

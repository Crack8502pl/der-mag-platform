import { Router, Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { SlicanCentralSpecification } from '../entities/SlicanCentralSpecification';
import { SlicanLicenseSpecification } from '../entities/SlicanLicenseSpecification';
import { SlicanVoipSubscriberFormula } from '../entities/SlicanVoipSubscriberFormula';
import { WarehouseStock } from '../entities/WarehouseStock';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import {
  calculateVoipSubscribers, defaultMultipliers, MissingLicensePackagesError,
  selectCentral, selectLicenses, SlicanAudioDemand
} from '../services/SlicanAudioService';

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const centralLimits = [
  'maxSipVoipSubscribers', 'maxDphIpDevices', 'maxAudioIpDevices', 'maxIvrChannels', 'maxConferenceChannels'
];
const optionalLimits = [
  'maxAllAccounts', 'maxCtsPhonesUp0Ip', 'maxConcurrentVoiceCalls',
  'maxConcurrentVideoCalls', 'maxWebctiMessengerctiAccounts'
];
const centralFields = ['warehouseStockId', 'modelName', ...centralLimits, ...optionalLimits, 'priority', 'isActive', 'notes'];
const licenseFields = ['warehouseStockId', 'licenseType', 'packageSize', 'demandField', 'priority', 'isActive'];
const demandByType: Record<string, string> = {
  VOIP_SUBSCRIBER: 'sipVoipSubscribers', AUDIO: 'audioDevices',
  IVR: 'ivrChannels', CONFERENCE: 'conferenceChannels'
};

function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Expected an object');
  return value as Record<string, any>;
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function validate(data: Record<string, any>, kind: 'central' | 'license', creating: boolean) {
  const fields = kind === 'central' ? centralFields : licenseFields;
  const required = kind === 'central'
    ? ['warehouseStockId', 'modelName', ...centralLimits]
    : ['warehouseStockId', 'licenseType', 'packageSize', 'demandField'];
  if (Object.keys(data).some(key => !fields.includes(key)) ||
      (creating && required.some(key => data[key] === undefined))) throw new ApiError(400, 'Missing or unknown fields');
  for (const [key, value] of Object.entries(data)) {
    if (key === 'warehouseStockId' && (!integer(value) || value === 0)) throw new ApiError(400, 'Invalid warehouseStockId');
    if ([...centralLimits, 'priority'].includes(key) && !integer(value)) throw new ApiError(400, `Invalid ${key}`);
    if (optionalLimits.includes(key) && value !== null && !integer(value)) throw new ApiError(400, `Invalid ${key}`);
    if (key === 'modelName' && (typeof value !== 'string' || !value.trim() || value.length > 50))
      throw new ApiError(400, 'Invalid modelName');
    if (key === 'notes' && value !== null && typeof value !== 'string') throw new ApiError(400, 'Invalid notes');
    if (key === 'isActive' && typeof value !== 'boolean') throw new ApiError(400, 'Invalid isActive');
    if (key === 'packageSize' && ![1, 10, 100].includes(value)) throw new ApiError(400, 'Invalid packageSize');
    if (key === 'licenseType' && !Object.hasOwn(demandByType, value)) throw new ApiError(400, 'Invalid licenseType');
    if (key === 'demandField' && !Object.values(demandByType).includes(value)) throw new ApiError(400, 'Invalid demandField');
  }
}

function idFrom(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError(400, 'Invalid ID');
  return id;
}

const handle = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(error => {
      if (error instanceof MissingLicensePackagesError) return res.status(422).json({ error: error.message });
      if (error instanceof ApiError) return res.status(error.status).json({ error: error.message });
      if (error?.code === '23505') return res.status(409).json({ error: 'Configuration already exists' });
      next(error);
    });
  };

async function checkWarehouse(id: number, currentId: number | undefined, kind: 'central' | 'license') {
  if (!await AppDataSource.getRepository(WarehouseStock).findOneBy({ id })) throw new ApiError(404, 'Warehouse stock not found');
  const central = await AppDataSource.getRepository(SlicanCentralSpecification).findOneBy({ warehouseStockId: id });
  const license = await AppDataSource.getRepository(SlicanLicenseSpecification).findOneBy({ warehouseStockId: id });
  if ((central && (kind !== 'central' || central.id !== currentId)) ||
      (license && (kind !== 'license' || license.id !== currentId)))
    throw new ApiError(409, 'Warehouse stock already assigned');
}

function crud(kind: 'central' | 'license') {
  const router = Router();
  router.use(authenticate);
  const entity = kind === 'central' ? SlicanCentralSpecification : SlicanLicenseSpecification;
  const repo = () => AppDataSource.getRepository(entity);

  if (kind === 'central') {
    router.get('/select', checkPermission('bom', 'read'), handle(async (req, res) => {
      let raw: Record<string, any>;
      try { raw = object(JSON.parse(String(req.query.demand))); }
      catch { throw new ApiError(400, 'Invalid demand JSON'); }
      const aliases: Record<string, string> = {
        dphIp: 'dphIpDevices', audioIp: 'audioIpDevices', cts220Ip: 'cts220IpDevices',
        ivr: 'ivrChannels', conf: 'conferenceChannels'
      };
      const parsed: Record<string, unknown> = { ...raw };
      for (const [short, long] of Object.entries(aliases)) {
        if (short in raw) {
          if (long in raw) throw new ApiError(400, `Duplicate demand field: ${long}`);
          parsed[long] = raw[short];
          delete parsed[short];
        }
      }
      const keys = Object.values(aliases);
      if (Object.keys(parsed).some(key => !keys.includes(key)) || keys.some(key => !integer(parsed[key])))
        throw new ApiError(400, 'Demand must contain five non-negative integer fields');
      const demand = parsed as unknown as SlicanAudioDemand;
      const formula = await AppDataSource.getRepository(SlicanVoipSubscriberFormula).findOneBy({ id: 1 });
      const sipVoipSubscribers = calculateVoipSubscribers(demand, formula ?? defaultMultipliers);
      if (!Number.isSafeInteger(sipVoipSubscribers)) throw new ApiError(400, 'Calculated demand is too large');
      const centrals = await AppDataSource.getRepository(SlicanCentralSpecification).find();
      const central = selectCentral(centrals, demand, sipVoipSubscribers);
      const warnings: string[] = [];
      if (!central) warnings.push(centrals.some(c => c.isActive) ? 'No central fits demand' : 'No active central configuration');
      const allLicenses = await AppDataSource.getRepository(SlicanLicenseSpecification).find();
      const result = selectLicenses(allLicenses, {
        sipVoipSubscribers, audioDevices: demand.audioIpDevices,
        ivrChannels: demand.ivrChannels, conferenceChannels: demand.conferenceChannels
      });
      res.json({ central, sipVoipSubscribers, licenses: result.licenses, warnings: [...warnings, ...result.warnings] });
    }));
  }

  router.get('/', checkPermission('bom', 'read'), handle(async (_req, res) => {
    res.json({ success: true, data: await repo().find({ order: { id: 'ASC' } }) });
  }));
  router.get('/:id', checkPermission('bom', 'read'), handle(async (req, res) => {
    const found = await repo().findOneBy({ id: idFrom(req) });
    if (!found) throw new ApiError(404, 'Specification not found');
    res.json({ success: true, data: found });
  }));
  router.post('/', checkPermission('bom', 'create'), handle(async (req, res) => {
    const data = object(req.body);
    validate(data, kind, true);
    await checkWarehouse(data.warehouseStockId, undefined, kind);
    if (kind === 'license' && data.demandField !== demandByType[data.licenseType])
      throw new ApiError(400, 'demandField does not match licenseType');
    const saved = await repo().save(repo().create(data));
    res.status(201).json({ success: true, data: saved });
  }));
  router.put('/:id', checkPermission('bom', 'update'), handle(async (req, res) => {
    const id = idFrom(req);
    const data = object(req.body);
    validate(data, kind, false);
    const current = await repo().findOneBy({ id });
    if (!current) throw new ApiError(404, 'Specification not found');
    if (data.warehouseStockId !== undefined) await checkWarehouse(data.warehouseStockId, id, kind);
    if (kind === 'license') {
      const license = current as unknown as SlicanLicenseSpecification;
      if ((data.demandField ?? license.demandField) !== demandByType[data.licenseType ?? license.licenseType])
        throw new ApiError(400, 'demandField does not match licenseType');
    }
    res.json({ success: true, data: await repo().save(Object.assign(current, data)) });
  }));
  router.delete('/:id', checkPermission('bom', 'delete'), handle(async (req, res) => {
    const result = await repo().delete(idFrom(req));
    if (!result.affected) throw new ApiError(404, 'Specification not found');
    res.json({ success: true });
  }));
  return router;
}

export const slicanCentralRoutes = crud('central');
export const slicanLicenseRoutes = crud('license');
export const slicanFormulaRoutes = Router();
slicanFormulaRoutes.use(authenticate);
slicanFormulaRoutes.get('/', checkPermission('bom', 'read'), handle(async (_req, res) => {
  const formula = await AppDataSource.getRepository(SlicanVoipSubscriberFormula).findOneBy({ id: 1 });
  res.json({ success: true, data: formula ?? { id: 1, ...defaultMultipliers } });
}));
slicanFormulaRoutes.put('/', checkPermission('bom', 'update'), handle(async (req, res) => {
  const data = object(req.body);
  const fields = Object.keys(defaultMultipliers);
  if (Object.keys(data).some(key => !fields.includes(key)) ||
      Object.entries(data).some(([, value]) => typeof value !== 'number' || !Number.isFinite(value) ||
        value < 0 || value > 999.99 || Number(value.toFixed(2)) !== value))
    throw new ApiError(400, 'Invalid multipliers');
  const repository = AppDataSource.getRepository(SlicanVoipSubscriberFormula);
  const current = await repository.findOneBy({ id: 1 });
  res.json({ success: true, data: await repository.save(
    Object.assign(current ?? repository.create({ id: 1, ...defaultMultipliers }), data)
  ) });
}));

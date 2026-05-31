import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Device } from '../entities/Device';
import { authenticate } from '../middleware/auth';
import { safeLike } from '../utils/queryBuilder';

const router = Router();
router.use(authenticate);

const mapDevice = (device: Device) => {
  const metadata = device.metadata || {};
  return {
    id: device.id,
    serialNumber: device.serialNumber,
    name: String((metadata as Record<string, unknown>).name || device.deviceModel || device.deviceType || device.serialNumber),
    model: device.deviceModel,
    manufacturer: device.manufacturer,
    deviceType: device.deviceType,
    configuration: ((metadata as Record<string, unknown>).configuration as Record<string, unknown>) || {},
    location: device.location,
    status: device.status || 'active',
    notes: device.notes,
    createdAt: device.createdAt,
    updatedAt: device.updatedAt,
  };
};

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const deviceType = String(req.query.deviceType || '').trim();

    const repo = AppDataSource.getRepository(Device);
    const qb = repo.createQueryBuilder('device');

    if (status) qb.andWhere('device.status = :status', { status });
    if (deviceType) qb.andWhere('device.deviceType = :deviceType', { deviceType });
    if (search) {
      const deviceSearchPredicate = [
        "device.serialNumber ILIKE :search ESCAPE '\\'",
        "device.deviceModel ILIKE :search ESCAPE '\\'",
        "device.manufacturer ILIKE :search ESCAPE '\\'",
      ].join(' OR ');

      // SAFE: parameterized query
      qb.andWhere(`(${deviceSearchPredicate})`, { search: safeLike(search) });
    }

    qb.orderBy('device.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [devices, total] = await qb.getManyAndCount();
    res.json({
      success: true,
      data: devices.map(mapDevice),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.get('/:id(\\d+)/history', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Device);
    const device = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!device) {
      res.status(404).json({ success: false, message: 'Urządzenie nie znalezione' });
      return;
    }

    const history = [
      { id: `created-${device.id}`, type: 'created', timestamp: device.createdAt, description: 'Utworzono urządzenie' },
      ...(device.prefabricationDate ? [{ id: `prefab-${device.id}`, type: 'prefabrication', timestamp: device.prefabricationDate, description: 'Przygotowanie prefabrykacyjne' }] : []),
      ...(device.installationDate ? [{ id: `install-${device.id}`, type: 'installation', timestamp: device.installationDate, description: 'Urządzenie zostało zainstalowane' }] : []),
      ...(device.verificationDate ? [{ id: `verify-${device.id}`, type: 'verification', timestamp: device.verificationDate, description: 'Urządzenie zweryfikowane' }] : []),
      { id: `updated-${device.id}`, type: 'updated', timestamp: device.updatedAt, description: 'Ostatnia aktualizacja urządzenia' },
    ];

    res.json({ success: true, data: history });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.get('/:id(\\d+)', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Device);
    const device = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!device) {
      res.status(404).json({ success: false, message: 'Urządzenie nie znalezione' });
      return;
    }

    res.json({ success: true, data: mapDevice(device) });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.post('/', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Device);
    const serialNumber = String(req.body.serialNumber || '').trim();
    const name = String(req.body.name || '').trim();
    if (!serialNumber || !name) {
      res.status(400).json({ success: false, message: 'Numer seryjny i nazwa są wymagane' });
      return;
    }

    const existing = await repo.findOne({ where: { serialNumber } });
    if (existing) {
      res.status(409).json({ success: false, message: 'Numer seryjny musi być unikalny' });
      return;
    }

    const metadata: Record<string, unknown> = {
      name,
      configuration: req.body.configuration || {},
    };

    const device = repo.create({
      serialNumber,
      deviceType: req.body.deviceType || 'unknown',
      deviceModel: req.body.model || req.body.name,
      manufacturer: req.body.manufacturer || null,
      location: req.body.location || null,
      status: req.body.status || 'active',
      notes: req.body.notes || null,
      metadata,
    });

    await repo.save(device);
    res.status(201).json({ success: true, data: mapDevice(device) });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.put('/:id(\\d+)', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Device);
    const device = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!device) {
      res.status(404).json({ success: false, message: 'Urządzenie nie znalezione' });
      return;
    }

    const serialNumber = req.body.serialNumber ? String(req.body.serialNumber).trim() : device.serialNumber;
    if (serialNumber !== device.serialNumber) {
      const existing = await repo.findOne({ where: { serialNumber } });
      if (existing && existing.id !== device.id) {
        res.status(409).json({ success: false, message: 'Numer seryjny musi być unikalny' });
        return;
      }
      device.serialNumber = serialNumber;
    }

    const metadata = (device.metadata || {}) as Record<string, unknown>;
    if (req.body.name) metadata.name = req.body.name;
    if (req.body.configuration) metadata.configuration = req.body.configuration;

    device.metadata = metadata;
    if (req.body.model !== undefined) device.deviceModel = req.body.model;
    if (req.body.manufacturer !== undefined) device.manufacturer = req.body.manufacturer;
    if (req.body.deviceType !== undefined) device.deviceType = req.body.deviceType;
    if (req.body.location !== undefined) device.location = req.body.location;
    if (req.body.status !== undefined) device.status = req.body.status;
    if (req.body.notes !== undefined) device.notes = req.body.notes;

    await repo.save(device);
    res.json({ success: true, data: mapDevice(device) });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.delete('/:id(\\d+)', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Device);
    const device = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!device) {
      res.status(404).json({ success: false, message: 'Urządzenie nie znalezione' });
      return;
    }

    await repo.remove(device);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.post('/serial', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Device);
    const serialNumber = String(req.body.serialNumber || '').trim();
    const name = String(req.body.name || req.body.deviceModel || 'Urządzenie').trim();
    if (!serialNumber) {
      res.status(400).json({ success: false, message: 'Numer seryjny jest wymagany' });
      return;
    }

    const existing = await repo.findOne({ where: { serialNumber } });
    if (existing) {
      res.status(409).json({ success: false, message: 'Numer seryjny musi być unikalny' });
      return;
    }

    const device = repo.create({
      serialNumber,
      deviceType: req.body.deviceType || 'unknown',
      deviceModel: req.body.deviceModel || name,
      manufacturer: req.body.manufacturer || null,
      status: req.body.status || 'active',
      metadata: { name, configuration: req.body.configuration || {} },
    });

    await repo.save(device);
    res.status(201).json({ success: true, data: mapDevice(device) });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.get('/:serialNumber', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Device);
    const device = await repo.findOne({ where: { serialNumber: req.params.serialNumber } });
    if (!device) {
      res.status(404).json({ success: false, message: 'Urządzenie nie znalezione' });
      return;
    }
    res.json({ success: true, data: mapDevice(device) });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.put('/:id/verify', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Device);
    const device = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!device) {
      res.status(404).json({ success: false, message: 'Urządzenie nie znalezione' });
      return;
    }

    device.status = 'verified';
    device.verificationDate = new Date();
    await repo.save(device);

    res.json({ success: true, data: mapDevice(device) });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

export default router;

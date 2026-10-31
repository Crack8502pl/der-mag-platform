// tests/unit/services/DeviceLinkingService.test.ts
import { DeviceLinkingService } from '../../../src/services/DeviceLinkingService';
import { AppDataSource } from '../../../src/config/database';
import { Asset } from '../../../src/entities/Asset';
import { Device } from '../../../src/entities/Device';
import { createMockRepository, createMockQueryBuilder } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    transaction: jest.fn(),
  },
}));

/** Helper to build a minimal Device object */
const makeDevice = (overrides: Partial<Device> = {}): Device => ({
  id: 1,
  serialNumber: 'SN001',
  deviceType: 'sensor',
  deviceModel: null as any,
  catalogNumber: null,
  manufacturer: null as any,
  task: null as any,
  taskId: null as any,
  installedAsset: null,
  installedAssetId: null,
  inventoryStatus: 'in_stock',
  status: 'prefabricated',
  prefabricationDate: null as any,
  verificationDate: null as any,
  installationDate: null as any,
  ipAddress: null as any,
  location: null as any,
  metadata: {},
  notes: null as any,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/** Helper to build a minimal Asset object */
const makeAsset = (overrides: Partial<Asset> = {}): Asset => ({
  id: 1,
  assetNumber: 'OBJ-0000010426',
  assetType: 'PRZEJAZD',
  name: 'Test Asset',
  category: null,
  liniaKolejowa: null,
  kilometraz: null,
  gpsLatitude: null,
  gpsLongitude: null,
  googleMapsUrl: null,
  miejscowosc: null,
  contract: null,
  contractId: null,
  subsystem: null,
  subsystemId: null,
  installationTask: null,
  installationTaskId: null,
  status: 'installed',
  plannedInstallationDate: null,
  actualInstallationDate: null,
  warrantyExpiryDate: null,
  lastServiceDate: null,
  nextServiceDueDate: null,
  decommissionDate: null,
  bomSnapshot: null,
  notes: null,
  photosFolder: null,
  createdByUser: null,
  createdBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  assetTasks: [],
  statusHistory: [],
  installedDevices: [],
  ...overrides,
});

describe('DeviceLinkingService', () => {
  let service: DeviceLinkingService;
  let mockAssetRepository: ReturnType<typeof createMockRepository<Asset>>;
  let mockDeviceRepository: ReturnType<typeof createMockRepository<Device>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAssetRepository = createMockRepository<Asset>();
    mockDeviceRepository = createMockRepository<Device>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === Asset) return mockAssetRepository;
      if (entity === Device) return mockDeviceRepository;
      return createMockRepository();
    });

    // Default: transaction just calls the callback with a manager that wraps the mock repos
    (AppDataSource.transaction as jest.Mock).mockImplementation(async (callback: any) => {
      const manager = {
        getRepository: (entity: any) => {
          if (entity === Asset) return mockAssetRepository;
          if (entity === Device) return mockDeviceRepository;
          return createMockRepository();
        },
      };
      return callback(manager);
    });

    service = new DeviceLinkingService();
  });

  // ─── linkDevicesToAsset ─────────────────────────────────────────────────────

  describe('linkDevicesToAsset', () => {
    it('should throw when asset not found', async () => {
      mockAssetRepository.findOne.mockResolvedValue(null);

      await expect(service.linkDevicesToAsset(99, []))
        .rejects.toThrow('Obiekt nie znaleziony');
    });

    it('requires field-installation evidence before linking any device', async () => {
      await expect(service.linkDevicesToAsset(1, ['SN001']))
        .rejects.toThrow('FIELD_INSTALLATION');
      expect(AppDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  // ─── unlinkDeviceFromAsset ──────────────────────────────────────────────────

  describe('unlinkDeviceFromAsset', () => {
    it('should unlink device and set inventoryStatus to in_stock', async () => {
      const device = makeDevice({ id: 5, installedAssetId: 1, inventoryStatus: 'installed' });
      mockDeviceRepository.findOne.mockResolvedValue(device);
      mockDeviceRepository.save.mockImplementation(async (d: any) => d);

      const result = await service.unlinkDeviceFromAsset(1, 5);

      expect(result.installedAssetId).toBeNull();
      expect(result.inventoryStatus).toBe('in_stock');
    });

    it('should throw when device not found', async () => {
      mockDeviceRepository.findOne.mockResolvedValue(null);

      await expect(service.unlinkDeviceFromAsset(1, 99))
        .rejects.toThrow('Urządzenie nie znalezione');
    });

    it('should throw when device is not installed on the given asset', async () => {
      const device = makeDevice({ installedAssetId: 99 }); // installed on a different asset
      mockDeviceRepository.findOne.mockResolvedValue(device);

      await expect(service.unlinkDeviceFromAsset(1, 1))
        .rejects.toThrow('nie jest zainstalowane na tym obiekcie');
    });
  });

  // ─── validateAgainstBOM ─────────────────────────────────────────────────────

  describe('validateAgainstBOM', () => {
    it('should throw when asset not found', async () => {
      mockAssetRepository.findOne.mockResolvedValue(null);

      await expect(service.validateAgainstBOM(99))
        .rejects.toThrow('Obiekt nie znaleziony');
    });

    it('should return valid=false with no BOM snapshot', async () => {
      const asset = makeAsset({ installedDevices: [], bomSnapshot: null });
      mockAssetRepository.findOne.mockResolvedValue(asset);

      const result = await service.validateAgainstBOM(1);

      expect(result.valid).toBe(false);
      expect(result.expectedFromBOM).toEqual([]);
      expect(result.summary.expectedCount).toBe(0);
    });

    it('should return valid=true when installed devices exactly match BOM', async () => {
      const device = makeDevice({ serialNumber: 'SN001' });
      const asset = makeAsset({
        installedDevices: [device],
        bomSnapshot: { items: [{ materialName: 'Sensor', serialNumbers: ['SN001'] }] },
      });
      mockAssetRepository.findOne.mockResolvedValue(asset);

      const result = await service.validateAgainstBOM(1);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
    });

    it('should detect missing devices (in BOM but not installed)', async () => {
      const asset = makeAsset({
        installedDevices: [],
        bomSnapshot: { items: [{ materialName: 'Sensor', serialNumbers: ['SN001'] }] },
      });
      mockAssetRepository.findOne.mockResolvedValue(asset);

      const result = await service.validateAgainstBOM(1);

      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(1);
      expect(result.summary.missingCount).toBe(1);
    });

    it('should detect extra devices (installed but not in BOM)', async () => {
      const device = makeDevice({ serialNumber: 'EXTRA01' });
      const asset = makeAsset({
        installedDevices: [device],
        bomSnapshot: { items: [] },
      });
      mockAssetRepository.findOne.mockResolvedValue(asset);

      const result = await service.validateAgainstBOM(1);

      expect(result.valid).toBe(false);
      expect(result.extra).toHaveLength(1);
      expect(result.summary.extraCount).toBe(1);
    });

    it('should match serial numbers case-insensitively', async () => {
      const device = makeDevice({ serialNumber: 'SN001' });
      const asset = makeAsset({
        installedDevices: [device],
        // BOM uses uppercase but device stores mixed
        bomSnapshot: { items: [{ materialName: 'Sensor', serialNumbers: ['sn001'] }] },
      });
      mockAssetRepository.findOne.mockResolvedValue(asset);

      const result = await service.validateAgainstBOM(1);

      // 'SN001' (installed) vs 'sn001' (BOM) — should be considered same
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
    });

    it('should report correct summary counts', async () => {
      const installed1 = makeDevice({ id: 1, serialNumber: 'SN001' });
      const installed2 = makeDevice({ id: 2, serialNumber: 'EXTRA' });
      const asset = makeAsset({
        installedDevices: [installed1, installed2],
        bomSnapshot: {
          items: [
            { serialNumbers: ['SN001'] }, // installed
            { serialNumbers: ['MISSING'] }, // not installed
          ],
        },
      });
      mockAssetRepository.findOne.mockResolvedValue(asset);

      const result = await service.validateAgainstBOM(1);

      expect(result.summary.expectedCount).toBe(2);
      expect(result.summary.installedCount).toBe(2);
      expect(result.summary.missingCount).toBe(1);
      expect(result.summary.extraCount).toBe(1);
    });
  });

  // ─── linkDevicesAndUpdateBOM ────────────────────────────────────────────────

  describe('linkDevicesAndUpdateBOM', () => {
    it('should throw when asset not found', async () => {
      mockAssetRepository.findOne.mockResolvedValue(null);

      await expect(service.linkDevicesAndUpdateBOM(99, []))
        .rejects.toThrow('Obiekt nie znaleziony');
    });

    it('should update bomSnapshot when provided', async () => {
      const asset = makeAsset({ id: 1 });
      mockAssetRepository.findOne.mockResolvedValue(asset);

      (mockAssetRepository.save as jest.Mock).mockResolvedValue({ ...asset, bomSnapshot: { items: [] } });

      const bomSnapshot = { items: [] };
      const result = await service.linkDevicesAndUpdateBOM(1, [], bomSnapshot);

      expect(mockAssetRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ bomSnapshot })
      );
      expect(result.asset).toBeDefined();
    });

    it('should not call assetRepository.save when no bomSnapshot provided', async () => {
      const asset = makeAsset({ id: 1 });
      mockAssetRepository.findOne.mockResolvedValue(asset);

      await service.linkDevicesAndUpdateBOM(1, []);

      expect(mockAssetRepository.save).not.toHaveBeenCalled();
    });

    it('should run inside a single transaction', async () => {
      const asset = makeAsset({ id: 1 });
      mockAssetRepository.findOne.mockResolvedValue(asset);

      await service.linkDevicesAndUpdateBOM(1, []);

      expect(AppDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects direct device links even when updating an asset BOM', async () => {
      await expect(service.linkDevicesAndUpdateBOM(1, ['SN001'], { items: [] }))
        .rejects.toThrow('FIELD_INSTALLATION');
      expect(AppDataSource.transaction).not.toHaveBeenCalled();
    });
  });
});

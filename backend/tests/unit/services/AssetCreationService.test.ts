// tests/unit/services/AssetCreationService.test.ts
import { AssetCreationService } from '../../../src/services/AssetCreationService';
import { AppDataSource } from '../../../src/config/database';
import { SubsystemTask, TaskWorkflowStatus } from '../../../src/entities/SubsystemTask';
import { Asset } from '../../../src/entities/Asset';
import { Device } from '../../../src/entities/Device';
import { SystemType } from '../../../src/entities/Subsystem';
import { createMockRepository } from '../../mocks/database.mock';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('../../../src/services/AssetNumberingService', () => ({
  AssetNumberingService: jest.fn().mockImplementation(() => ({
    generateAssetNumber: jest.fn().mockResolvedValue('OBJ-0000150426'),
  })),
}));

jest.mock('../../../src/services/DeviceLinkingService');
jest.mock('../../../src/services/TaskSyncService', () => ({
  TaskSyncService: {
    syncFromSubsystemTask: jest.fn().mockResolvedValue(undefined),
  },
}));

import { DeviceLinkingService } from '../../../src/services/DeviceLinkingService';
import { TaskSyncService } from '../../../src/services/TaskSyncService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeSubsystem = (overrides: any = {}) => ({
  id: 10,
  systemType: SystemType.SMOKIP_A,
  contractId: 5,
  contract: { id: 5 },
  ...overrides,
});

const makeTask = (overrides: any = {}): SubsystemTask => ({
  id: 42,
  taskNumber: 'Z0004204426',
  taskName: 'Test Task',
  taskType: 'PRZEJAZD_KAT_A',
  status: TaskWorkflowStatus.DEPLOYED,
  substatus: null,
  subsystemId: 10,
  subsystem: makeSubsystem(),
  bomGenerated: false,
  bomId: null,
  bom: null,
  taskBomId: null,
  taskBom: null,
  completionOrderId: null,
  completionOrder: null,
  completionStartedAt: null,
  completionCompletedAt: null,
  prefabricationTaskId: null,
  prefabricationTask: null,
  prefabricationStartedAt: null,
  prefabricationCompletedAt: null,
  deploymentScheduledAt: null,
  deploymentCompletedAt: null,
  verificationCompletedAt: null,
  realizationStartedAt: null,
  realizationCompletedAt: null,
  metadata: {},
  linkedAsset: null,
  linkedAssetId: null,
  taskRole: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as SubsystemTask);

const makeAsset = (overrides: Partial<Asset> = {}): Asset => ({
  id: 15,
  assetNumber: 'OBJ-0000150426',
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
  contractId: 5,
  subsystem: null,
  subsystemId: 10,
  installationTask: null,
  installationTaskId: 42,
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

const makeDevice = (overrides: Partial<Device> = {}): Device => ({
  id: 20,
  serialNumber: 'CAM001',
  deviceType: 'camera',
  deviceModel: null as any,
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AssetCreationService', () => {
  let service: AssetCreationService;
  let mockTaskRepository: ReturnType<typeof createMockRepository<SubsystemTask>>;
  let mockDeviceLinkingService: jest.Mocked<Pick<DeviceLinkingService, 'linkDevicesWithManager'>>;

  /** Build a mock transaction manager with repositories for Asset and SubsystemTask */
  const buildMockManager = (savedAsset: Asset, savedTask: SubsystemTask) => {
    const assetRepo = { create: jest.fn().mockReturnValue(savedAsset), save: jest.fn().mockResolvedValue(savedAsset) };
    const taskRepo = { save: jest.fn().mockResolvedValue(savedTask) };
    return {
      getRepository: jest.fn().mockImplementation((entity: any) => {
        if (entity === Asset) return assetRepo;
        if (entity === SubsystemTask) return taskRepo;
        return createMockRepository();
      }),
      assetRepo,
      taskRepo,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockTaskRepository = createMockRepository<SubsystemTask>();
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockTaskRepository);

    mockDeviceLinkingService = {
      linkDevicesWithManager: jest.fn(),
    } as any;
    (DeviceLinkingService as jest.Mock).mockImplementation(() => mockDeviceLinkingService);

    service = new AssetCreationService();
  });

  // ── createAssetFromTask ──────────────────────────────────────────────────────

  describe('createAssetFromTask', () => {
    it('should throw when task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createAssetFromTask(99, { name: 'Test' })
      ).rejects.toThrow('Zadanie nie znalezione');
    });

    it('should throw when task is already completed (VERIFIED)', async () => {
      mockTaskRepository.findOne.mockResolvedValue(
        makeTask({ status: TaskWorkflowStatus.VERIFIED })
      );

      await expect(
        service.createAssetFromTask(42, { name: 'Test' })
      ).rejects.toThrow('Zadanie jest już zakończone');
    });

    it('should throw when task has no subsystem', async () => {
      mockTaskRepository.findOne.mockResolvedValue(
        makeTask({ subsystem: null })
      );

      await expect(
        service.createAssetFromTask(42, { name: 'Test' })
      ).rejects.toThrow('Zadanie nie ma przypisanego podsystemu');
    });

    it('should throw when subsystem has no contract', async () => {
      mockTaskRepository.findOne.mockResolvedValue(
        makeTask({ subsystem: makeSubsystem({ contract: null }) })
      );

      await expect(
        service.createAssetFromTask(42, { name: 'Test' })
      ).rejects.toThrow('Podsystem nie ma przypisanego kontraktu');
    });

    it('should create asset and complete task on happy path (no devices)', async () => {
      const task = makeTask();
      const asset = makeAsset();
      const savedTask = { ...task, status: TaskWorkflowStatus.VERIFIED };

      mockTaskRepository.findOne.mockResolvedValue(task);

      const { assetRepo, taskRepo, ...mockManager } = buildMockManager(asset, savedTask as SubsystemTask);
      (AppDataSource.transaction as jest.Mock).mockImplementation(async (cb: any) => cb(mockManager));

      const result = await service.createAssetFromTask(42, { name: 'Test Asset' });

      expect(assetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assetNumber: 'OBJ-0000150426',
          contractId: 5,
          subsystemId: 10,
          installationTaskId: 42,
          status: 'installed',
        })
      );
      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TaskWorkflowStatus.VERIFIED,
          linkedAssetId: 15,
          taskRole: 'installation',
          metadata: expect.objectContaining({ assetId: 15 }),
        })
      );
      expect(result.asset).toEqual(asset);
      expect(result.linkedDevices).toEqual([]);
      expect(result.warnings).toBeUndefined();
    });

    it('should call TaskSyncService after the transaction', async () => {
      const task = makeTask();
      const asset = makeAsset();
      const savedTask = { ...task, status: TaskWorkflowStatus.VERIFIED };

      mockTaskRepository.findOne.mockResolvedValue(task);
      const mockManager = buildMockManager(asset, savedTask as SubsystemTask);
      (AppDataSource.transaction as jest.Mock).mockImplementation(async (cb: any) => cb(mockManager));

      await service.createAssetFromTask(42, { name: 'Test' });

      expect(TaskSyncService.syncFromSubsystemTask).toHaveBeenCalledWith(
        savedTask.taskNumber,
        TaskWorkflowStatus.VERIFIED
      );
    });

    it('should link devices within the same transaction and return them', async () => {
      const task = makeTask();
      const asset = makeAsset();
      const device = makeDevice({ id: 20, serialNumber: 'CAM001' });
      const savedTask = { ...task, status: TaskWorkflowStatus.VERIFIED };

      mockTaskRepository.findOne.mockResolvedValue(task);
      mockDeviceLinkingService.linkDevicesWithManager.mockResolvedValue({
        linked: [device],
        notFound: [],
        alreadyInstalled: [],
      });

      const mockManager = buildMockManager(asset, savedTask as SubsystemTask);
      (AppDataSource.transaction as jest.Mock).mockImplementation(async (cb: any) => cb(mockManager));

      const result = await service.createAssetFromTask(42, { name: 'Test' }, ['CAM001']);

      expect(mockDeviceLinkingService.linkDevicesWithManager).toHaveBeenCalledWith(
        mockManager,
        15,         // asset.id
        ['CAM001'],
        null        // bomSnapshot
      );
      expect(result.linkedDevices).toHaveLength(1);
      expect(result.warnings).toBeUndefined();
    });

    it('should collect warnings for notFound and alreadyInstalled devices', async () => {
      const task = makeTask();
      const asset = makeAsset();
      const device = makeDevice();
      const savedTask = { ...task, status: TaskWorkflowStatus.VERIFIED };

      mockTaskRepository.findOne.mockResolvedValue(task);
      mockDeviceLinkingService.linkDevicesWithManager.mockResolvedValue({
        linked: [device],
        notFound: ['SN999'],
        alreadyInstalled: ['SN111'],
      });

      const mockManager = buildMockManager(asset, savedTask as SubsystemTask);
      (AppDataSource.transaction as jest.Mock).mockImplementation(async (cb: any) => cb(mockManager));

      const result = await service.createAssetFromTask(42, { name: 'Test' }, ['CAM001', 'SN999', 'SN111']);

      expect(result.warnings).toHaveLength(2);
      expect(result.warnings![0]).toContain('SN999');
      expect(result.warnings![1]).toContain('SN111');
    });

    it('should not call linkDevicesWithManager when no deviceSerialNumbers', async () => {
      const task = makeTask();
      const asset = makeAsset();
      const savedTask = { ...task, status: TaskWorkflowStatus.VERIFIED };

      mockTaskRepository.findOne.mockResolvedValue(task);
      const mockManager = buildMockManager(asset, savedTask as SubsystemTask);
      (AppDataSource.transaction as jest.Mock).mockImplementation(async (cb: any) => cb(mockManager));

      await service.createAssetFromTask(42, { name: 'Test' });

      expect(mockDeviceLinkingService.linkDevicesWithManager).not.toHaveBeenCalled();
    });

    it('should not call linkDevicesWithManager for empty deviceSerialNumbers array', async () => {
      const task = makeTask();
      const asset = makeAsset();
      const savedTask = { ...task, status: TaskWorkflowStatus.VERIFIED };

      mockTaskRepository.findOne.mockResolvedValue(task);
      const mockManager = buildMockManager(asset, savedTask as SubsystemTask);
      (AppDataSource.transaction as jest.Mock).mockImplementation(async (cb: any) => cb(mockManager));

      await service.createAssetFromTask(42, { name: 'Test' }, []);

      expect(mockDeviceLinkingService.linkDevicesWithManager).not.toHaveBeenCalled();
    });

    it('should extract BOM from task.metadata.bom and pass to asset/device creation', async () => {
      const bom = { items: [{ name: 'Camera', qty: 2 }] };
      const task = makeTask({ metadata: { bom } });
      const asset = makeAsset({ bomSnapshot: bom });
      const savedTask = { ...task, status: TaskWorkflowStatus.VERIFIED };

      mockTaskRepository.findOne.mockResolvedValue(task);
      mockDeviceLinkingService.linkDevicesWithManager.mockResolvedValue({ linked: [], notFound: [], alreadyInstalled: [] });

      const mockManager = buildMockManager(asset, savedTask as SubsystemTask);
      (AppDataSource.transaction as jest.Mock).mockImplementation(async (cb: any) => cb(mockManager));

      await service.createAssetFromTask(42, { name: 'Test' }, ['SN1']);

      expect(mockManager.assetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ bomSnapshot: bom })
      );
    });

    it('should extract BOM from task.metadata.configParams.bom as fallback', async () => {
      const bom = { items: [{ name: 'Switch', qty: 1 }] };
      const task = makeTask({ metadata: { configParams: { bom } } });
      const asset = makeAsset({ bomSnapshot: bom });
      const savedTask = { ...task, status: TaskWorkflowStatus.VERIFIED };

      mockTaskRepository.findOne.mockResolvedValue(task);
      mockDeviceLinkingService.linkDevicesWithManager.mockResolvedValue({ linked: [], notFound: [], alreadyInstalled: [] });

      const mockManager = buildMockManager(asset, savedTask as SubsystemTask);
      (AppDataSource.transaction as jest.Mock).mockImplementation(async (cb: any) => cb(mockManager));

      await service.createAssetFromTask(42, { name: 'Test' }, ['SN1']);

      expect(mockManager.assetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ bomSnapshot: bom })
      );
    });

    it('should roll back (reject) when the transaction callback throws', async () => {
      const task = makeTask();
      mockTaskRepository.findOne.mockResolvedValue(task);
      (AppDataSource.transaction as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(service.createAssetFromTask(42, { name: 'Test' }))
        .rejects.toThrow('DB error');
    });
  });

  // ── deriveAssetTypeFromTask ──────────────────────────────────────────────────

  describe('asset type derivation', () => {
    /** Helper: run a createAssetFromTask call and return the assetType that was passed to assetRepo.create */
    const runDerivation = async (taskOverrides: any) => {
      const task = makeTask(taskOverrides);
      const asset = makeAsset();
      const savedTask = { ...task, status: TaskWorkflowStatus.VERIFIED };

      mockTaskRepository.findOne.mockResolvedValue(task);
      const mockManager = buildMockManager(asset, savedTask as SubsystemTask);
      (AppDataSource.transaction as jest.Mock).mockImplementation(async (cb: any) => cb(mockManager));

      await service.createAssetFromTask(42, { name: 'Test' });
      return (mockManager.assetRepo.create as jest.Mock).mock.calls[0][0].assetType as string;
    };

    it('uses metadata.configParams.assetType when set', async () => {
      const type = await runDerivation({ metadata: { configParams: { assetType: 'LCS' } } });
      expect(type).toBe('LCS');
    });

    it('derives PRZEJAZD from taskType keyword', async () => {
      const type = await runDerivation({ taskType: 'PRZEJAZD_KAT_A', metadata: {} });
      expect(type).toBe('PRZEJAZD');
    });

    it('derives SKP from taskType keyword', async () => {
      const type = await runDerivation({ taskType: 'INSTALL_SKP_TYPE', metadata: {} });
      expect(type).toBe('SKP');
    });

    it('derives LCS from taskType keyword', async () => {
      const type = await runDerivation({ taskType: 'LCS_INSTALLATION', metadata: {} });
      expect(type).toBe('LCS');
    });

    it('derives NASTAWNIA from taskType keyword', async () => {
      const type = await runDerivation({ taskType: 'NASTAWNIA_BUILD', metadata: {} });
      expect(type).toBe('NASTAWNIA');
    });

    it('derives CUID from taskType keyword', async () => {
      const type = await runDerivation({ taskType: 'CUID_SETUP', metadata: {} });
      expect(type).toBe('CUID');
    });

    it('maps SMOKIP_A systemType to PRZEJAZD', async () => {
      const type = await runDerivation({
        taskType: 'GENERIC',
        metadata: {},
        subsystem: makeSubsystem({ systemType: SystemType.SMOKIP_A }),
      });
      expect(type).toBe('PRZEJAZD');
    });

    it('maps SMOKIP_B systemType to PRZEJAZD', async () => {
      const type = await runDerivation({
        taskType: 'GENERIC',
        metadata: {},
        subsystem: makeSubsystem({ systemType: SystemType.SMOKIP_B }),
      });
      expect(type).toBe('PRZEJAZD');
    });

    it('falls back to PRZEJAZD for unmapped systemType (e.g. CCTV)', async () => {
      const type = await runDerivation({
        taskType: 'GENERIC',
        metadata: {},
        subsystem: makeSubsystem({ systemType: SystemType.CCTV }),
      });
      expect(type).toBe('PRZEJAZD');
    });
  });
});


import { PrefabricationService, DeviceConfigurationParams, DeviceVerificationParams } from '../../../src/services/PrefabricationService';
import { AppDataSource } from '../../../src/config/database';
import { PrefabricationTask, PrefabricationTaskStatus } from '../../../src/entities/PrefabricationTask';
import { PrefabricationDevice, PrefabricationDeviceStatus } from '../../../src/entities/PrefabricationDevice';
import { DeviceIPAssignment, DeviceIPStatus } from '../../../src/entities/DeviceIPAssignment';
import { NetworkAllocation } from '../../../src/entities/NetworkAllocation';
import { Subsystem, SubsystemStatus } from '../../../src/entities/Subsystem';
import { SubsystemTask, TaskWorkflowStatus } from '../../../src/entities/SubsystemTask';
import { createMockQueryBuilder, createMockRepository } from '../../mocks/database.mock';

jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

const mockUpdateStatusForSubsystem = jest.fn();

jest.mock('../../../src/services/SubsystemTaskService', () => ({
  SubsystemTaskService: jest.fn().mockImplementation(() => ({
    updateStatusForSubsystem: mockUpdateStatusForSubsystem,
  })),
}));

describe('PrefabricationService', () => {
  let service: PrefabricationService;
  let mockPrefabTaskRepo: any;
  let mockDeviceRepo: any;
  let mockIpAssignmentRepo: any;
  let mockNetworkAllocationRepo: any;
  let mockSubsystemRepo: any;
  let mockSubsystemTaskRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new PrefabricationService();
    mockPrefabTaskRepo = createMockRepository<PrefabricationTask>();
    mockDeviceRepo = createMockRepository<PrefabricationDevice>();
    mockIpAssignmentRepo = createMockRepository<DeviceIPAssignment>();
    mockNetworkAllocationRepo = createMockRepository<NetworkAllocation>();
    mockSubsystemRepo = createMockRepository<Subsystem>();
    mockSubsystemTaskRepo = createMockRepository<SubsystemTask>();

    mockDeviceRepo.create.mockImplementation((data: any) => data);

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === PrefabricationTask) return mockPrefabTaskRepo;
      if (entity === PrefabricationDevice) return mockDeviceRepo;
      if (entity === DeviceIPAssignment) return mockIpAssignmentRepo;
      if (entity === NetworkAllocation) return mockNetworkAllocationRepo;
      if (entity === Subsystem) return mockSubsystemRepo;
      if (entity === SubsystemTask) return mockSubsystemTaskRepo;
      return createMockRepository();
    });
  });

  describe('getDevicesTable', () => {
    it('returns device rows with allocation and prefab status', async () => {
      mockPrefabTaskRepo.findOne.mockResolvedValue({
        id: 1,
        subsystemId: 5,
        devices: [{ id: 10, ipAssignmentId: 101, status: PrefabricationDeviceStatus.CONFIGURED }],
      });
      mockNetworkAllocationRepo.findOne.mockResolvedValue({
        gateway: '172.16.0.1',
        subnetMask: '255.255.255.0',
        deviceAssignments: [{
          id: 101,
          deviceType: 'Axis P3375-V',
          deviceCategory: 'CAMERA',
          serialNumber: 'SN-1',
          ipAddress: '172.16.0.10',
          description: 'Kamera peron',
          hostname: 'cam-01',
        }],
      });

      const result = await service.getDevicesTable(1);

      expect(result).toEqual([
        expect.objectContaining({
          lp: 1,
          nazwa: 'Axis P3375-V',
          model: 'Axis P3375-V',
          typ: 'CAMERA',
          sn: 'SN-1',
          ip: '172.16.0.10',
          maska: '255.255.255.0',
          brama: '172.16.0.1',
          ntp: '172.16.0.1',
          opisProjektowy: 'Kamera peron',
          deviceId: 10,
          status: PrefabricationDeviceStatus.CONFIGURED,
        }),
      ]);
    });

    it('throws when prefab task does not exist', async () => {
      mockPrefabTaskRepo.findOne.mockResolvedValue(null);

      await expect(service.getDevicesTable(99)).rejects.toThrow('Zadanie prefabrykacji nie znalezione');
    });

    it('throws when network allocation is missing', async () => {
      mockPrefabTaskRepo.findOne.mockResolvedValue({ id: 1, subsystemId: 2, devices: [] });
      mockNetworkAllocationRepo.findOne.mockResolvedValue(null);

      await expect(service.getDevicesTable(1)).rejects.toThrow('Brak alokacji sieci dla podsystemu');
    });
  });

  describe('configureDevice', () => {
    const params: DeviceConfigurationParams = {
      prefabTaskId: 1,
      ipAssignmentId: 15,
      serialNumber: 'SN-100',
      userId: 7,
    };

    it('configures a device and updates task status from CREATED to IN_PROGRESS', async () => {
      const task = { id: 1, subsystemId: 99, status: PrefabricationTaskStatus.CREATED };
      const ipAssignment = { id: 15, hostname: 'cam-15', status: DeviceIPStatus.ASSIGNED };
      mockPrefabTaskRepo.findOne.mockResolvedValue(task);
      mockIpAssignmentRepo.findOne
        .mockResolvedValueOnce(ipAssignment)
        .mockResolvedValueOnce(null);
      mockDeviceRepo.findOne.mockResolvedValue(null);
      mockDeviceRepo.save.mockImplementation(async (value: any) => ({ id: 501, ...value }));

      const result = await service.configureDevice(params);

      expect(mockIpAssignmentRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        serialNumber: 'SN-100',
        status: DeviceIPStatus.CONFIGURED,
        configuredBy: 7,
      }));
      expect(mockDeviceRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        prefabTaskId: 1,
        ipAssignmentId: 15,
        status: PrefabricationDeviceStatus.CONFIGURED,
      }));
      expect(mockPrefabTaskRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: PrefabricationTaskStatus.IN_PROGRESS }));
      expect(mockUpdateStatusForSubsystem).toHaveBeenCalledWith(99, TaskWorkflowStatus.PREFABRICATION_IN_PROGRESS);
      expect(result).toEqual(expect.objectContaining({ status: PrefabricationDeviceStatus.CONFIGURED }));
    });

    it('throws when serial number is already used by another assignment', async () => {
      mockPrefabTaskRepo.findOne.mockResolvedValue({ id: 1, subsystemId: 99, status: PrefabricationTaskStatus.CREATED });
      mockIpAssignmentRepo.findOne
        .mockResolvedValueOnce({ id: 15, hostname: 'cam-15' })
        .mockResolvedValueOnce({ id: 16, serialNumber: 'SN-100' });

      await expect(service.configureDevice(params)).rejects.toThrow('Numer seryjny SN-100 już został użyty');
    });

    it('throws when prefab task does not exist', async () => {
      mockPrefabTaskRepo.findOne.mockResolvedValue(null);

      await expect(service.configureDevice(params)).rejects.toThrow('Zadanie prefabrykacji nie znalezione');
    });

    it('throws when ip assignment does not exist', async () => {
      mockPrefabTaskRepo.findOne.mockResolvedValue({ id: 1, subsystemId: 99, status: PrefabricationTaskStatus.CREATED });
      mockIpAssignmentRepo.findOne.mockResolvedValue(null);

      await expect(service.configureDevice(params)).rejects.toThrow('Przypisanie IP nie znalezione');
    });
  });

  describe('verifyDevice', () => {
    const params: DeviceVerificationParams = {
      prefabTaskId: 1,
      deviceId: 25,
      userId: 11,
      notes: 'OK',
    };

    it('verifies configured device and updates assignment status', async () => {
      const device = { id: 25, prefabTaskId: 1, ipAssignmentId: 90, status: PrefabricationDeviceStatus.CONFIGURED, notes: null };
      const assignment = { id: 90, status: DeviceIPStatus.CONFIGURED };
      mockDeviceRepo.findOne.mockResolvedValue(device);
      mockIpAssignmentRepo.findOne.mockResolvedValue(assignment);

      const result = await service.verifyDevice(params);

      expect(mockDeviceRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        status: PrefabricationDeviceStatus.VERIFIED,
        notes: 'OK',
      }));
      expect(mockIpAssignmentRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        status: DeviceIPStatus.VERIFIED,
        verifiedBy: 11,
      }));
      expect(result.status).toBe(PrefabricationDeviceStatus.VERIFIED);
    });

    it('throws when device is not configured', async () => {
      mockDeviceRepo.findOne.mockResolvedValue({ id: 25, prefabTaskId: 1, status: PrefabricationDeviceStatus.PENDING });

      await expect(service.verifyDevice(params)).rejects.toThrow('Urządzenie nie jest skonfigurowane');
    });

    it('throws when device does not exist', async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyDevice(params)).rejects.toThrow('Urządzenie prefabrykacyjne nie znalezione');
    });
  });

  describe('completeTask', () => {
    it('completes task when all devices are verified', async () => {
      const subsystem = { id: 8, status: SubsystemStatus.IN_PREFABRICATION };
      const task = {
        id: 1,
        subsystemId: 8,
        status: PrefabricationTaskStatus.IN_PROGRESS,
        devices: [{ status: PrefabricationDeviceStatus.VERIFIED }],
        subsystem,
      };
      mockPrefabTaskRepo.findOne.mockResolvedValue(task);

      const result = await service.completeTask(1);

      expect(mockPrefabTaskRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        status: PrefabricationTaskStatus.COMPLETED,
      }));
      expect(mockSubsystemRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        status: SubsystemStatus.READY_FOR_DEPLOYMENT,
      }));
      expect(mockUpdateStatusForSubsystem).toHaveBeenCalledWith(
        8,
        TaskWorkflowStatus.PREFABRICATION_COMPLETED,
        expect.objectContaining({ prefabricationCompletedAt: expect.any(Date) })
      );
      expect(result.status).toBe(PrefabricationTaskStatus.COMPLETED);
    });

    it('throws when not all devices are verified', async () => {
      mockPrefabTaskRepo.findOne.mockResolvedValue({
        id: 1,
        subsystemId: 8,
        devices: [{ status: PrefabricationDeviceStatus.CONFIGURED }],
      });

      await expect(service.completeTask(1)).rejects.toThrow('Nie wszystkie urządzenia zostały zweryfikowane');
    });

    it('throws when task does not exist', async () => {
      mockPrefabTaskRepo.findOne.mockResolvedValue(null);

      await expect(service.completeTask(1)).rejects.toThrow('Zadanie prefabrykacji nie znalezione');
    });
  });

  describe('validatePrefabricationReadiness', () => {
    it('returns ready status when tasks are configured and IP pool exists', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue({ id: 5 });
      mockSubsystemTaskRepo.find.mockResolvedValue([
        { taskNumber: 'Z1', taskName: 'A', status: TaskWorkflowStatus.BOM_GENERATED },
        { taskNumber: 'Z2', taskName: 'B', status: TaskWorkflowStatus.PREFABRICATION_ASSIGNED },
      ]);
      mockNetworkAllocationRepo.findOne.mockResolvedValue({ id: 22 });
      mockIpAssignmentRepo.count.mockResolvedValue(3);

      const result = await service.validatePrefabricationReadiness(5);

      expect(result).toEqual(expect.objectContaining({
        canStartPrefabrication: true,
        allTasksConfigured: true,
        totalSubsystemTasks: 2,
        configuredTasks: 2,
        ipDevicesCount: 3,
      }));
      expect(result.message).toContain('Gotowe do prefabrykacji');
    });

    it('returns missing tasks message when subsystem has no tasks', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue({ id: 5 });
      mockSubsystemTaskRepo.find.mockResolvedValue([]);
      mockNetworkAllocationRepo.findOne.mockResolvedValue(null);

      const result = await service.validatePrefabricationReadiness(5);

      expect(result.canStartPrefabrication).toBe(false);
      expect(result.message).toBe('Brak zadań w podsystemie.');
    });

    it('returns list of unconfigured tasks', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue({ id: 5 });
      mockSubsystemTaskRepo.find.mockResolvedValue([
        { taskNumber: 'Z1', taskName: 'A', status: TaskWorkflowStatus.CREATED },
        { taskNumber: 'Z2', taskName: 'B', status: TaskWorkflowStatus.BOM_GENERATED },
      ]);
      mockNetworkAllocationRepo.findOne.mockResolvedValue({ id: 22 });
      mockIpAssignmentRepo.count.mockResolvedValue(1);

      const result = await service.validatePrefabricationReadiness(5);

      expect(result.canStartPrefabrication).toBe(false);
      expect(result.missingTasks).toEqual([
        { taskNumber: 'Z1', taskName: 'A', status: TaskWorkflowStatus.CREATED },
      ]);
      expect(result.message).toContain('Nie wszystkie zadania osiągnęły wymagany status konfiguracji');
    });

    it('returns no IP pool message when tasks are configured but allocation is missing', async () => {
      mockSubsystemRepo.findOne.mockResolvedValue({ id: 5 });
      mockSubsystemTaskRepo.find.mockResolvedValue([
        { taskNumber: 'Z1', taskName: 'A', status: TaskWorkflowStatus.BOM_GENERATED },
      ]);
      mockNetworkAllocationRepo.findOne.mockResolvedValue(null);

      const result = await service.validatePrefabricationReadiness(5);

      expect(result.canStartPrefabrication).toBe(false);
      expect(result.message).toBe('Brak przypisanej puli adresów IP do podsystemu. Przypisz alokację sieciową.');
    });
  });

  describe('listTasks', () => {
    it('lists tasks without filters', async () => {
      const queryBuilder = createMockQueryBuilder<PrefabricationTask>();
      queryBuilder.getMany.mockResolvedValue([{ id: 1 } as PrefabricationTask]);
      mockPrefabTaskRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.listTasks();

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('task.createdAt', 'DESC');
      expect(queryBuilder.getMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 1 }]);
    });

    it('applies status, assignee and subsystem filters', async () => {
      const queryBuilder = createMockQueryBuilder<PrefabricationTask>();
      queryBuilder.getMany.mockResolvedValue([]);
      mockPrefabTaskRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.listTasks({
        status: PrefabricationTaskStatus.IN_PROGRESS,
        assignedToId: 4,
        subsystemId: 7,
      });

      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(1, 'task.status = :status', { status: PrefabricationTaskStatus.IN_PROGRESS });
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(2, 'task.assignedToId = :assignedToId', { assignedToId: 4 });
      expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(3, 'task.subsystemId = :subsystemId', { subsystemId: 7 });
    });
  });

  describe('getDeviceLabelData', () => {
    it('returns label data for device', async () => {
      mockDeviceRepo.findOne.mockResolvedValue({
        id: 12,
        ipAssignment: {
          serialNumber: 'SN-200',
          ipAddress: '172.16.0.20',
          hostname: 'cam-20',
          description: 'Opis',
          deviceType: 'Axis',
        },
        prefabTask: {
          subsystemId: 2,
          subsystem: { subsystemNumber: 'P000010101' },
        },
      });
      mockNetworkAllocationRepo.findOne.mockResolvedValue({ subnetMask: '255.255.255.0', gateway: '172.16.0.1' });

      const result = await service.getDeviceLabelData(1, 12);

      expect(result).toEqual({
        serialNumber: 'SN-200',
        ipAddress: '172.16.0.20',
        hostname: 'cam-20',
        description: 'Opis',
        deviceType: 'Axis',
        subnetMask: '255.255.255.0',
        gateway: '172.16.0.1',
        ntp: '172.16.0.1',
        subsystemNumber: 'P000010101',
      });
    });

    it('throws when device is missing', async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);

      await expect(service.getDeviceLabelData(1, 12)).rejects.toThrow('Urządzenie nie znalezione');
    });

    it('throws when allocation is missing', async () => {
      mockDeviceRepo.findOne.mockResolvedValue({
        id: 12,
        ipAssignment: {},
        prefabTask: { subsystemId: 2, subsystem: { subsystemNumber: 'P000010101' } },
      });
      mockNetworkAllocationRepo.findOne.mockResolvedValue(null);

      await expect(service.getDeviceLabelData(1, 12)).rejects.toThrow('Alokacja sieci nie znaleziona');
    });
  });
});

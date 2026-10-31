import { Asset } from '../../../src/entities/Asset';
import { Device } from '../../../src/entities/Device';
import { DeviceInstallationWorkflow, DeviceInstallationStatus } from '../../../src/entities/DeviceInstallationWorkflow';
import { FormInstance } from '../../../src/entities/FormInstance';
import { FormInstanceStatus, FormProcedureType } from '../../../src/entities/FormTypes';
import { FormTemplateVersion } from '../../../src/entities/FormTemplateVersion';
import { Task } from '../../../src/entities/Task';
import { FormDomainError } from '../../../src/errors/FormDomainError';
import { DeviceInstallationWorkflowService } from '../../../src/services/DeviceInstallationWorkflowService';

jest.mock('../../../src/config/database', () => ({ AppDataSource: {} }));

describe('DeviceInstallationWorkflowService', () => {
  const device = {
    id: 8, installedAssetId: null, inventoryStatus: 'in_stock', installationDate: null,
  } as unknown as Device;
  const preconfiguration = {
    id: 1, templateVersionId: 11, deviceId: 8, status: FormInstanceStatus.APPROVED,
  } as FormInstance;
  const installation = {
    id: 2, templateVersionId: 12, deviceId: 8, taskId: 20, objectId: 30, status: FormInstanceStatus.APPROVED,
  } as FormInstance;
  const verification = { ...installation, id: 3 } as FormInstance;
  const workflow = {
    id: 4, deviceId: 8, preconfigurationInstanceId: 1,
    status: DeviceInstallationStatus.READY_FOR_FIELD_INSTALLATION,
    readyAt: new Date(), fieldInstallationTaskId: null, installationInstanceId: null,
    installedAssetId: null, verificationInstanceId: null, commissionedAt: null, createdById: 5,
  } as DeviceInstallationWorkflow;

  function harness(overrides: {
    preconfiguration?: Partial<FormInstance>;
    installation?: Partial<FormInstance>;
    verification?: Partial<FormInstance>;
    device?: Partial<Device>;
    procedureType?: FormProcedureType;
    preconfigurationProcedureType?: FormProcedureType;
    assetExists?: boolean;
  } = {}) {
    const repositories = new Map<unknown, any>();
    const repo = (initial?: any) => ({
      findOne: jest.fn().mockResolvedValue(initial ?? null),
      create: jest.fn(value => value),
      save: jest.fn(async value => value),
    });
    const instances = repo();
    const formInstances: Record<number, FormInstance> = {
      1: { ...preconfiguration, ...overrides.preconfiguration },
      2: { ...installation, ...overrides.installation },
      3: { ...verification, ...overrides.verification },
    };
    instances.findOne.mockImplementation(async ({ where }: any) => formInstances[Number(where.id)] ?? null);
    const devices = repo({ ...device, ...overrides.device });
    const versions = repo();
    const templateVersions: Record<number, { id: number; procedureType: FormProcedureType }> = {
      11: { id: 11, procedureType: overrides.preconfigurationProcedureType ?? FormProcedureType.DEVICE_PRECONFIGURATION },
      12: { id: 12, procedureType: overrides.procedureType ?? FormProcedureType.FIELD_INSTALLATION },
    };
    versions.findOne.mockImplementation(async ({ where }: any) => templateVersions[Number(where.id)] ?? null);
    const workflows = repo();
    const tasks = repo({ id: 20 });
    const assets = repo();
    assets.findOne.mockResolvedValue(overrides.assetExists === false ? null : { id: 30 });
    repositories.set(FormInstance, instances);
    repositories.set(Device, devices);
    repositories.set(FormTemplateVersion, versions);
    repositories.set(DeviceInstallationWorkflow, workflows);
    repositories.set(Task, tasks);
    repositories.set(Asset, assets);
    const manager = {
      getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
      query: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      transaction: jest.fn((callback: (manager: any) => unknown) => callback(manager)),
      getRepository: manager.getRepository,
    };
    return {
      service: new DeviceInstallationWorkflowService(dataSource as any),
      instances, devices, workflows, manager,
    };
  }

  it('creates readiness only from an approved preconfiguration form and does not link an asset', async () => {
    const { service, devices, workflows, manager } = harness();
    const guard = jest.fn().mockResolvedValue(undefined);
    const result = await service.recordReadiness(1, 5, guard);
    expect(result).toMatchObject({
      deviceId: 8, preconfigurationInstanceId: 1,
      status: DeviceInstallationStatus.READY_FOR_FIELD_INSTALLATION,
    });
    expect(devices.save).not.toHaveBeenCalled();
    expect(workflows.save).toHaveBeenCalledTimes(1);
    expect(guard).toHaveBeenCalledWith(manager, expect.objectContaining({ id: 1 }));
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_logs'), expect.any(Array));
  });

  it.each([
    ['unapproved form', { preconfiguration: { status: FormInstanceStatus.SUBMITTED } }, 'approved form instance'],
    ['wrong procedure', { preconfigurationProcedureType: FormProcedureType.FIELD_INSTALLATION }, 'DEVICE_PRECONFIGURATION form'],
    ['already-linked device', { device: { installedAssetId: 30 } }, 'already installed'],
  ])('rejects readiness for %s', async (_label, overrides, message) => {
    const { service, workflows } = harness(overrides as any);
    await expect(service.recordReadiness(1, 5)).rejects.toThrow(message);
    expect(workflows.save).not.toHaveBeenCalled();
  });

  it('requires ordered, distinct installation and verification evidence before commissioning', async () => {
    const { service, devices, workflows, manager } = harness();
    const ready = await service.recordReadiness(1, 5);
    const storedWorkflow = { ...ready, id: 4 };
    workflows.findOne.mockResolvedValue(storedWorkflow);

    const installed = await service.recordInstallation(4, 20, 2, 5);
    expect(installed.status).toBe(DeviceInstallationStatus.INSTALLED);
    expect(installed.installedAssetId).toBe(30);
    expect(devices.save).toHaveBeenCalledWith(expect.objectContaining({
      installedAssetId: 30, inventoryStatus: 'installed',
    }));

    await expect(service.commission(4, 5)).rejects.toBeInstanceOf(FormDomainError);
    await expect(service.recordVerification(4, 2, 5)).rejects.toThrow('separate form');
    const verified = await service.recordVerification(4, 3, 5);
    expect(verified.status).toBe(DeviceInstallationStatus.VERIFIED);
    await expect(service.recordVerification(4, 2, 5)).rejects.toThrow('Expected workflow status INSTALLED');
    const commissioned = await service.commission(4, 5);
    expect(commissioned.status).toBe(DeviceInstallationStatus.COMMISSIONED);
    expect(commissioned.commissionedAt).toBeInstanceOf(Date);
    expect(manager.query).toHaveBeenCalledTimes(4);
  });

  it('rejects installation evidence for another task, device, procedure, or target asset', async () => {
    const { service, workflows } = harness();
    const ready = await service.recordReadiness(1, 5);
    workflows.findOne.mockResolvedValue({ ...ready, id: 4 });

    await expect(service.recordInstallation(4, 21, 2, 5)).rejects.toThrow('match the workflow device and task');
    const wrongProcedure = harness({ procedureType: FormProcedureType.DEVICE_PRECONFIGURATION });
    await wrongProcedure.service.recordReadiness(1, 5);
    wrongProcedure.workflows.findOne.mockResolvedValue({ ...ready, id: 4 });
    await expect(wrongProcedure.service.recordInstallation(4, 20, 2, 5)).rejects.toThrow('FIELD_INSTALLATION form');

    const wrongDevice = harness({ installation: { deviceId: 99 } });
    await wrongDevice.service.recordReadiness(1, 5);
    wrongDevice.workflows.findOne.mockResolvedValue({ ...ready, id: 4 });
    await expect(wrongDevice.service.recordInstallation(4, 20, 2, 5)).rejects.toThrow('match the workflow device and task');

    const wrongAsset = harness({ installation: { objectId: 31 }, assetExists: false });
    await wrongAsset.service.recordReadiness(1, 5);
    wrongAsset.workflows.findOne.mockResolvedValue({ ...ready, id: 4 });
    await expect(wrongAsset.service.recordInstallation(4, 20, 2, 5)).rejects.toThrow('Installation target asset was not found');
  });
});

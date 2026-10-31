import { DataSource, EntityManager, Not } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Asset } from '../entities/Asset';
import { Device } from '../entities/Device';
import { DeviceInstallationStatus, DeviceInstallationWorkflow } from '../entities/DeviceInstallationWorkflow';
import { FormInstance } from '../entities/FormInstance';
import { FormInstanceStatus, FormProcedureType } from '../entities/FormTypes';
import { Task } from '../entities/Task';
import { FormTemplateVersion } from '../entities/FormTemplateVersion';
import { FormDomainError } from '../errors/FormDomainError';
import { FormAuditService } from './FormAuditService';

export type InstallationWorkflowAccessGuard = (
  manager: EntityManager,
  workflow: DeviceInstallationWorkflow,
) => Promise<void>;

export type InstallationWorkflowFormAccessGuard = (
  manager: EntityManager,
  instance: FormInstance,
) => Promise<void>;

export class DeviceInstallationWorkflowService {
  constructor(private readonly dataSource: DataSource = AppDataSource) {}

  async recordReadiness(
    preconfigurationInstanceId: number,
    actorId: number,
    accessGuard?: InstallationWorkflowFormAccessGuard,
  ): Promise<DeviceInstallationWorkflow> {
    return this.dataSource.transaction(async manager => {
      const instance = await manager.getRepository(FormInstance).findOne({
        where: { id: preconfigurationInstanceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!instance) throw new FormDomainError('INSTANCE_NOT_FOUND', 'Preconfiguration form instance was not found');
      await accessGuard?.(manager, instance);
      await this.assertApprovedProcedure(manager, instance, FormProcedureType.DEVICE_PRECONFIGURATION);
      if (instance.deviceId === null) {
        throw new FormDomainError('INVALID_INSTANCE_CONTEXT', 'Preconfiguration instance must identify a device');
      }

      const deviceRepository = manager.getRepository(Device);
      const device = await deviceRepository.findOne({
        where: { id: instance.deviceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!device) throw new FormDomainError('INVALID_INSTANCE_CONTEXT', 'Preconfigured device was not found');
      this.assertInstallable(device);

      const workflows = manager.getRepository(DeviceInstallationWorkflow);
      const existing = await workflows.findOne({
        where: {
          deviceId: device.id,
          status: Not(DeviceInstallationStatus.COMMISSIONED),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing) {
        throw new FormDomainError('INVALID_INSTALLATION_WORKFLOW', 'Device already has an active installation workflow');
      }

      const now = new Date();
      const workflow = await workflows.save(workflows.create({
        deviceId: device.id,
        preconfigurationInstanceId: instance.id,
        status: DeviceInstallationStatus.READY_FOR_FIELD_INSTALLATION,
        readyAt: now,
        fieldInstallationTaskId: null,
        installationInstanceId: null,
        installedAssetId: null,
        verificationInstanceId: null,
        commissionedAt: null,
        createdById: actorId,
      }));
      await FormAuditService.record(manager, 'DEVICE_READY_FOR_FIELD_INSTALLATION', actorId,
        'device_installation_workflow', workflow.id, [
          { field: 'preconfigurationInstanceId', previousValue: null, newValue: instance.id },
          { field: 'deviceId', previousValue: null, newValue: device.id },
          { field: 'status', previousValue: null, newValue: workflow.status },
        ]);
      return workflow;
    });
  }

  async recordInstallation(
    workflowId: number,
    taskId: number,
    installationInstanceId: number,
    actorId: number,
    accessGuard?: InstallationWorkflowAccessGuard,
  ): Promise<DeviceInstallationWorkflow> {
    return this.dataSource.transaction(async manager => {
      const workflow = await this.lockWorkflow(manager, workflowId);
      await accessGuard?.(manager, workflow);
      this.assertStatus(workflow, DeviceInstallationStatus.READY_FOR_FIELD_INSTALLATION);

      const task = await manager.getRepository(Task).findOne({ where: { id: taskId } });
      if (!task) throw new FormDomainError('INVALID_INSTANCE_CONTEXT', 'Field installation task was not found');
      const instance = await manager.getRepository(FormInstance).findOne({
        where: { id: installationInstanceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!instance) throw new FormDomainError('INSTANCE_NOT_FOUND', 'Field installation instance was not found');
      await this.assertInstallationInstance(manager, instance, workflow, taskId);
      if (instance.objectId === null) {
        throw new FormDomainError('INVALID_INSTANCE_CONTEXT', 'Field installation instance must identify the target asset');
      }
      const asset = await manager.getRepository(Asset).findOne({ where: { id: instance.objectId } });
      if (!asset) throw new FormDomainError('INVALID_INSTANCE_CONTEXT', 'Installation target asset was not found');

      const deviceRepository = manager.getRepository(Device);
      const device = await deviceRepository.findOne({
        where: { id: workflow.deviceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!device) throw new FormDomainError('INVALID_INSTANCE_CONTEXT', 'Installation device was not found');
      this.assertInstallable(device);
      if (device.installedAssetId !== null) {
        throw new FormDomainError('INVALID_INSTANCE_CONTEXT', 'Device is already installed on an asset');
      }

      device.installedAssetId = asset.id;
      device.inventoryStatus = 'installed';
      device.installationDate = new Date();
      await deviceRepository.save(device);

      workflow.fieldInstallationTaskId = task.id;
      workflow.installationInstanceId = instance.id;
      workflow.installedAssetId = asset.id;
      workflow.status = DeviceInstallationStatus.INSTALLED;
      const saved = await manager.getRepository(DeviceInstallationWorkflow).save(workflow);
      await FormAuditService.record(manager, 'DEVICE_INSTALLED_DURING_FIELD_INSTALLATION', actorId,
        'device_installation_workflow', workflow.id, [
          { field: 'fieldInstallationTaskId', previousValue: null, newValue: task.id },
          { field: 'installationInstanceId', previousValue: null, newValue: instance.id },
          { field: 'installedAssetId', previousValue: null, newValue: asset.id },
          { field: 'status', previousValue: DeviceInstallationStatus.READY_FOR_FIELD_INSTALLATION, newValue: saved.status },
        ]);
      return saved;
    });
  }

  async recordVerification(
    workflowId: number,
    verificationInstanceId: number,
    actorId: number,
    accessGuard?: InstallationWorkflowAccessGuard,
  ): Promise<DeviceInstallationWorkflow> {
    return this.dataSource.transaction(async manager => {
      const workflow = await this.lockWorkflow(manager, workflowId);
      await accessGuard?.(manager, workflow);
      this.assertStatus(workflow, DeviceInstallationStatus.INSTALLED);
      const instance = await manager.getRepository(FormInstance).findOne({
        where: { id: verificationInstanceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!instance) throw new FormDomainError('INSTANCE_NOT_FOUND', 'Post-installation verification instance was not found');
      await this.assertInstallationInstance(manager, instance, workflow, workflow.fieldInstallationTaskId!);
      if (instance.id === workflow.installationInstanceId || instance.objectId !== workflow.installedAssetId) {
        throw new FormDomainError('INVALID_INSTANCE_CONTEXT', 'Verification must be a separate form for the installed asset');
      }

      workflow.verificationInstanceId = instance.id;
      workflow.status = DeviceInstallationStatus.VERIFIED;
      const saved = await manager.getRepository(DeviceInstallationWorkflow).save(workflow);
      await FormAuditService.record(manager, 'DEVICE_POST_INSTALLATION_VERIFIED', actorId,
        'device_installation_workflow', workflow.id, [
          { field: 'verificationInstanceId', previousValue: null, newValue: instance.id },
          { field: 'status', previousValue: DeviceInstallationStatus.INSTALLED, newValue: saved.status },
        ]);
      return saved;
    });
  }

  async commission(
    workflowId: number,
    actorId: number,
    accessGuard?: InstallationWorkflowAccessGuard,
  ): Promise<DeviceInstallationWorkflow> {
    return this.dataSource.transaction(async manager => {
      const workflow = await this.lockWorkflow(manager, workflowId);
      await accessGuard?.(manager, workflow);
      this.assertStatus(workflow, DeviceInstallationStatus.VERIFIED);
      const deviceRepository = manager.getRepository(Device);
      const device = await deviceRepository.findOne({
        where: { id: workflow.deviceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!device || device.installedAssetId !== workflow.installedAssetId || device.inventoryStatus !== 'installed') {
        throw new FormDomainError('INVALID_INSTANCE_CONTEXT', 'Device installation no longer matches the verified asset');
      }

      workflow.status = DeviceInstallationStatus.COMMISSIONED;
      workflow.commissionedAt = new Date();
      const saved = await manager.getRepository(DeviceInstallationWorkflow).save(workflow);
      await FormAuditService.record(manager, 'DEVICE_COMMISSIONED', actorId,
        'device_installation_workflow', workflow.id, [
          { field: 'status', previousValue: DeviceInstallationStatus.VERIFIED, newValue: saved.status },
          { field: 'commissionedAt', previousValue: null, newValue: saved.commissionedAt },
        ]);
      return saved;
    });
  }

  async getWorkflow(workflowId: number): Promise<DeviceInstallationWorkflow> {
    const workflow = await this.dataSource.getRepository(DeviceInstallationWorkflow).findOne({ where: { id: workflowId } });
    if (!workflow) throw new FormDomainError('INVALID_INSTALLATION_WORKFLOW', 'Device installation workflow was not found');
    return workflow;
  }

  private async lockWorkflow(manager: EntityManager, workflowId: number): Promise<DeviceInstallationWorkflow> {
    const workflow = await manager.getRepository(DeviceInstallationWorkflow).findOne({
      where: { id: workflowId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!workflow) throw new FormDomainError('INVALID_INSTALLATION_WORKFLOW', 'Device installation workflow was not found');
    return workflow;
  }

  private async assertApprovedProcedure(
    manager: EntityManager,
    instance: FormInstance,
    procedureType: FormProcedureType,
  ): Promise<void> {
    if (instance.status !== FormInstanceStatus.APPROVED) {
      throw new FormDomainError('INVALID_INSTANCE_STATUS', 'Workflow evidence must be an approved form instance');
    }
    const version = await manager.getRepository(FormTemplateVersion).findOne({
      where: { id: instance.templateVersionId },
    });
    if (!version || version.procedureType !== procedureType) {
      throw new FormDomainError('INVALID_INSTANCE_CONTEXT', `Expected an approved ${procedureType} form instance`);
    }
  }

  private async assertInstallationInstance(
    manager: EntityManager,
    instance: FormInstance,
    workflow: DeviceInstallationWorkflow,
    taskId: number,
  ): Promise<void> {
    await this.assertApprovedProcedure(manager, instance, FormProcedureType.FIELD_INSTALLATION);
    if (instance.deviceId !== workflow.deviceId || instance.taskId !== taskId) {
      throw new FormDomainError('INVALID_INSTANCE_CONTEXT', 'Field installation form must match the workflow device and task');
    }
  }

  private assertInstallable(device: Device): void {
    if (device.installedAssetId !== null || device.inventoryStatus === 'installed') {
      throw new FormDomainError('INVALID_INSTANCE_CONTEXT', 'Device is already installed on an asset');
    }
    if (device.inventoryStatus === 'faulty' || device.inventoryStatus === 'decommissioned') {
      throw new FormDomainError('INVALID_INSTANCE_CONTEXT', `Device in ${device.inventoryStatus} status cannot be installed`);
    }
  }

  private assertStatus(workflow: DeviceInstallationWorkflow, expected: DeviceInstallationStatus): void {
    if (workflow.status !== expected) {
      throw new FormDomainError('INVALID_INSTALLATION_WORKFLOW', `Expected workflow status ${expected}, got ${workflow.status}`);
    }
  }
}

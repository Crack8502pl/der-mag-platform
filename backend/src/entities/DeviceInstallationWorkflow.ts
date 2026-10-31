import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum DeviceInstallationStatus {
  READY_FOR_FIELD_INSTALLATION = 'READY_FOR_FIELD_INSTALLATION',
  INSTALLED = 'INSTALLED',
  VERIFIED = 'VERIFIED',
  COMMISSIONED = 'COMMISSIONED',
}

@Entity('device_installation_workflows')
@Index('uq_device_installation_active_device', ['deviceId'], {
  unique: true,
  where: `"status" <> 'COMMISSIONED'`,
})
@Index('uq_device_installation_preconfiguration', ['preconfigurationInstanceId'], { unique: true })
@Index('uq_device_installation_installation_form', ['installationInstanceId'], { unique: true })
@Index('uq_device_installation_verification_form', ['verificationInstanceId'], { unique: true })
@Index('idx_device_installation_status', ['status'])
@Check(
  'chk_device_installation_workflow_state',
  `("status" = 'READY_FOR_FIELD_INSTALLATION' AND "ready_at" IS NOT NULL) OR
   ("status" = 'INSTALLED' AND "ready_at" IS NOT NULL AND "field_installation_task_id" IS NOT NULL
     AND "installation_instance_id" IS NOT NULL AND "installed_asset_id" IS NOT NULL) OR
   ("status" = 'VERIFIED' AND "ready_at" IS NOT NULL AND "field_installation_task_id" IS NOT NULL
     AND "installation_instance_id" IS NOT NULL AND "installed_asset_id" IS NOT NULL
     AND "verification_instance_id" IS NOT NULL) OR
   ("status" = 'COMMISSIONED' AND "ready_at" IS NOT NULL AND "field_installation_task_id" IS NOT NULL
     AND "installation_instance_id" IS NOT NULL AND "installed_asset_id" IS NOT NULL
     AND "verification_instance_id" IS NOT NULL AND "commissioned_at" IS NOT NULL)`,
)
export class DeviceInstallationWorkflow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'device_id', type: 'int' })
  deviceId: number;

  @Column({ name: 'preconfiguration_instance_id', type: 'int' })
  preconfigurationInstanceId: number;

  @Column({ type: 'varchar', length: 40 })
  status: DeviceInstallationStatus;

  @Column({ name: 'ready_at', type: 'timestamp' })
  readyAt: Date;

  @Column({ name: 'field_installation_task_id', type: 'int', nullable: true })
  fieldInstallationTaskId: number | null;

  @Column({ name: 'installation_instance_id', type: 'int', nullable: true })
  installationInstanceId: number | null;

  @Column({ name: 'installed_asset_id', type: 'int', nullable: true })
  installedAssetId: number | null;

  @Column({ name: 'verification_instance_id', type: 'int', nullable: true })
  verificationInstanceId: number | null;

  @Column({ name: 'commissioned_at', type: 'timestamp', nullable: true })
  commissionedAt: Date | null;

  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

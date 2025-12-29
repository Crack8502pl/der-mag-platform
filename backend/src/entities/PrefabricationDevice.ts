// src/entities/PrefabricationDevice.ts
// Encja urządzenia w prefabrykacji

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PrefabricationTask } from './PrefabricationTask';
import { DeviceIPAssignment } from './DeviceIPAssignment';

export enum PrefabricationDeviceStatus {
  PENDING = 'PENDING',
  CONFIGURED = 'CONFIGURED',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED'
}

@Entity('prefabrication_devices')
export class PrefabricationDevice {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PrefabricationTask, task => task.devices)
  @JoinColumn({ name: 'prefab_task_id' })
  prefabTask: PrefabricationTask;

  @Column({ name: 'prefab_task_id' })
  prefabTaskId: number;

  @ManyToOne(() => DeviceIPAssignment)
  @JoinColumn({ name: 'ip_assignment_id' })
  ipAssignment: DeviceIPAssignment;

  @Column({ name: 'ip_assignment_id' })
  ipAssignmentId: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: PrefabricationDeviceStatus.PENDING
  })
  status: PrefabricationDeviceStatus;

  @Column({ name: 'configured_at', type: 'timestamp', nullable: true })
  configuredAt: Date;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;
}

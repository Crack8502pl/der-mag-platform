// src/entities/DeviceIPAssignment.ts
// Encja przypisania IP do urządzenia

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { NetworkAllocation } from './NetworkAllocation';

export enum DeviceCategory {
  CAMERA = 'CAMERA',
  SWITCH = 'SWITCH',
  ROUTER = 'ROUTER',
  NVR = 'NVR',
  SERVER = 'SERVER',
  IOT = 'IOT',
  ACCESS_POINT = 'ACCESS_POINT',
  OTHER = 'OTHER'
}

export enum DeviceIPStatus {
  PLANNED = 'PLANNED',
  ASSIGNED = 'ASSIGNED',
  CONFIGURED = 'CONFIGURED',
  VERIFIED = 'VERIFIED',
  DEPLOYED = 'DEPLOYED'
}

@Entity('device_ip_assignments')
export class DeviceIPAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => NetworkAllocation, allocation => allocation.deviceAssignments)
  @JoinColumn({ name: 'allocation_id' })
  allocation: NetworkAllocation;

  @Column({ name: 'allocation_id' })
  allocationId: number;

  @Column({ name: 'ip_address', type: 'inet' })
  ipAddress: string;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  serialNumber: string;

  @Column({
    name: 'device_category',
    type: 'varchar',
    length: 20
  })
  deviceCategory: DeviceCategory;

  @Column({ name: 'device_type', type: 'varchar', length: 100 })
  deviceType: string; // np. "Axis P3375-V"

  @Column({ type: 'varchar', length: 100 })
  hostname: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: DeviceIPStatus.PLANNED
  })
  status: DeviceIPStatus;

  @Column({ name: 'configured_by', type: 'int', nullable: true })
  configuredBy: number; // user id

  @Column({ name: 'configured_at', type: 'timestamp', nullable: true })
  configuredAt: Date;

  @Column({ name: 'verified_by', type: 'int', nullable: true })
  verifiedBy: number; // user id

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ name: 'firmware_version', type: 'varchar', length: 50, nullable: true })
  firmwareVersion: string;

  @Column({ name: 'test_results', type: 'jsonb', nullable: true })
  testResults: {
    ping?: boolean;
    httpAccess?: boolean;
    customTests?: Record<string, any>;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

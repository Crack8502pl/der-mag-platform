// src/entities/Device.ts
// Encja urządzenia z numerem seryjnym

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Task } from './Task';
import { Asset } from './Asset';

export type DeviceInventoryStatus = 'in_stock' | 'reserved' | 'installed' | 'faulty' | 'returned' | 'decommissioned';

@Entity('devices')
@Index(['serialNumber'], { unique: true })
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, unique: true })
  serialNumber: string;

  @Column({ type: 'varchar', name: 'device_type', length: 100 })
  deviceType: string;

  @Column({ type: 'varchar', name: 'device_model', length: 100, nullable: true })
  deviceModel: string;

  @Column({ type: 'varchar', name: 'catalog_number', length: 200, nullable: true })
  catalogNumber: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer: string;

  @ManyToOne(() => Task, task => task.devices, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'int', name: 'task_id', nullable: true })
  taskId: number;

  @ManyToOne(() => Asset, asset => asset.installedDevices, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'installed_asset_id' })
  installedAsset: Asset | null;

  @Column({ name: 'installed_asset_id', type: 'int', nullable: true })
  installedAssetId: number | null;

  @Column({ name: 'inventory_status', type: 'varchar', length: 50, default: 'in_stock', nullable: true })
  inventoryStatus: DeviceInventoryStatus | null; // in_stock, reserved, installed, faulty, returned, decommissioned

  @Column({ type: 'varchar', length: 50, default: 'prefabricated' })
  status: string;

  @Column({ name: 'prefabrication_date', type: 'timestamp', nullable: true })
  prefabricationDate: Date;

  @Column({ name: 'verification_date', type: 'timestamp', nullable: true })
  verificationDate: Date;

  @Column({ name: 'installation_date', type: 'timestamp', nullable: true })
  installationDate: Date;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

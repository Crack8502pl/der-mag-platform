// src/entities/Asset.ts
// Encja zasobu infrastruktury fizycznej (Asset Management)

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Contract } from './Contract';
import { Subsystem } from './Subsystem';
import { SubsystemTask } from './SubsystemTask';
import { User } from './User';
import { AssetTask } from './AssetTask';
import { AssetStatusHistory } from './AssetStatusHistory';
import { Device } from './Device';

@Entity('assets')
@Index(['assetNumber'], { unique: true })
@Index(['assetType'])
@Index(['status'])
@Index(['contractId'])
@Index(['subsystemId'])
export class Asset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'asset_number', type: 'varchar', length: 20, unique: true })
  assetNumber: string; // Format: OBJ-XXXXXXMMRR

  @Column({ name: 'asset_type', type: 'varchar', length: 50 })
  assetType: string; // PRZEJAZD, LCS, CUID, NASTAWNIA, SKP

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  category: string | null; // KAT A, KAT B, KAT C, KAT E, KAT F

  // Location data
  @Column({ name: 'linia_kolejowa', type: 'varchar', length: 20, nullable: true })
  liniaKolejowa: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  kilometraz: string | null;

  @Column({ name: 'gps_latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  gpsLatitude: number | null;

  @Column({ name: 'gps_longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  gpsLongitude: number | null;

  @Column({ name: 'google_maps_url', type: 'text', nullable: true })
  googleMapsUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  miejscowosc: string | null;

  // Relations
  @ManyToOne(() => Contract, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract | null;

  @Column({ name: 'contract_id', type: 'int', nullable: true })
  contractId: number | null;

  @ManyToOne(() => Subsystem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subsystem_id' })
  subsystem: Subsystem | null;

  @Column({ name: 'subsystem_id', type: 'int', nullable: true })
  subsystemId: number | null;

  @ManyToOne(() => SubsystemTask, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'installation_task_id' })
  installationTask: SubsystemTask | null;

  @Column({ name: 'installation_task_id', type: 'int', nullable: true })
  installationTaskId: number | null;

  // Lifecycle status
  @Column({ type: 'varchar', length: 50, default: 'planned' })
  status: string;

  // Lifecycle dates
  @Column({ name: 'planned_installation_date', type: 'date', nullable: true })
  plannedInstallationDate: Date | null;

  @Column({ name: 'actual_installation_date', type: 'date', nullable: true })
  actualInstallationDate: Date | null;

  @Column({ name: 'warranty_expiry_date', type: 'date', nullable: true })
  warrantyExpiryDate: Date | null;

  @Column({ name: 'last_service_date', type: 'date', nullable: true })
  lastServiceDate: Date | null;

  @Column({ name: 'next_service_due_date', type: 'date', nullable: true })
  nextServiceDueDate: Date | null;

  @Column({ name: 'decommission_date', type: 'date', nullable: true })
  decommissionDate: Date | null;

  // BOM snapshot
  @Column({ name: 'bom_snapshot', type: 'jsonb', nullable: true })
  bomSnapshot: Record<string, any> | null;

  // Metadata
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'photos_folder', type: 'varchar', length: 255, nullable: true })
  photosFolder: string | null;

  // Audit fields
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations (One-to-Many)
  @OneToMany(() => AssetTask, assetTask => assetTask.asset)
  assetTasks: AssetTask[];

  @OneToMany(() => AssetStatusHistory, history => history.asset)
  statusHistory: AssetStatusHistory[];

  @OneToMany(() => Device, device => device.installedAsset)
  installedDevices: Device[];
}

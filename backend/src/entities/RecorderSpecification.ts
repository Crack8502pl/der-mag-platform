// src/entities/RecorderSpecification.ts
// Entity for recorder specifications (NVR/DVR models with camera capacity)

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { WarehouseStock } from './WarehouseStock';

@Entity('recorder_specifications')
@Index(['warehouseStockId'])
@Index(['minCameras', 'maxCameras'])
export class RecorderSpecification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => WarehouseStock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_stock_id' })
  warehouseStock: WarehouseStock;

  @Column({ type: 'int', name: 'warehouse_stock_id' })
  warehouseStockId: number;

  @Column({ name: 'model_name', type: 'varchar', length: 100 })
  modelName: string;

  @Column({ name: 'min_cameras', type: 'integer', default: 1 })
  minCameras: number;

  @Column({ name: 'max_cameras', type: 'integer' })
  maxCameras: number;

  @Column({ name: 'disk_slots', type: 'integer', default: 1 })
  diskSlots: number;

  @Column({ name: 'max_storage_tb', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxStorageTb: number | null;

  @Column({
    name: 'supported_disk_capacities',
    type: 'jsonb',
    default: [6, 8, 10, 12, 14, 18]
  })
  supportedDiskCapacities: number[];

  @Column({ name: 'requires_extension', type: 'boolean', default: false })
  requiresExtension: boolean;

  @ManyToOne(() => WarehouseStock, { nullable: true })
  @JoinColumn({ name: 'extension_warehouse_stock_id' })
  extensionWarehouseStock: WarehouseStock | null;

  @Column({ type: 'int', name: 'extension_warehouse_stock_id', nullable: true })
  extensionWarehouseStockId: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// src/entities/DiskSpecification.ts
// Entity for disk specifications compatible with NVR recorders

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

export enum DiskType {
  HDD_SURVEILLANCE = 'HDD_SURVEILLANCE',
  HDD_ENTERPRISE = 'HDD_ENTERPRISE',
  SSD = 'SSD'
}

@Entity('disk_specifications')
@Index(['warehouseStockId'])
@Index(['capacityTb'])
export class DiskSpecification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => WarehouseStock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_stock_id' })
  warehouseStock: WarehouseStock;

  @Column({ type: 'int', name: 'warehouse_stock_id' })
  warehouseStockId: number;

  @Column({ name: 'capacity_tb', type: 'decimal', precision: 10, scale: 2 })
  capacityTb: number;

  @Column({
    name: 'disk_type',
    type: 'varchar',
    length: 50,
    default: DiskType.HDD_SURVEILLANCE
  })
  diskType: DiskType;

  @Column({ name: 'compatible_recorder_ids', type: 'jsonb', default: [] })
  compatibleRecorderIds: number[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 10 })
  priority: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

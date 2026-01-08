// src/entities/SubsystemWarehouseStock.ts
// Przypisanie materiałów do subsystemów

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
import { Subsystem } from './Subsystem';
import { WarehouseStock } from './WarehouseStock';
import { User } from './User';

export enum SubsystemStockStatus {
  PENDING = 'PENDING',
  RESERVED = 'RESERVED',
  ALLOCATED = 'ALLOCATED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum AssignmentSource {
  MANUAL = 'MANUAL',
  AUTO_BOM = 'AUTO_BOM',
  AUTO_WORKFLOW = 'AUTO_WORKFLOW'
}

@Entity('subsystem_warehouse_stock')
@Index(['subsystemId', 'warehouseStockId'], { unique: true })
export class SubsystemWarehouseStock {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Subsystem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subsystem_id' })
  subsystem: Subsystem;

  @Column({ name: 'subsystem_id' })
  subsystemId: number;

  @ManyToOne(() => WarehouseStock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_stock_id' })
  warehouseStock: WarehouseStock;

  @Column({ name: 'warehouse_stock_id' })
  warehouseStockId: number;

  // Ilości
  @Column({ name: 'quantity_required', type: 'decimal', precision: 10, scale: 2 })
  quantityRequired: number;

  @Column({ name: 'quantity_reserved', type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantityReserved: number;

  @Column({ name: 'quantity_allocated', type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantityAllocated: number;

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    default: SubsystemStockStatus.PENDING
  })
  status: SubsystemStockStatus;

  // Źródło przypisania
  @Column({
    name: 'assignment_source',
    type: 'varchar',
    length: 50,
    default: AssignmentSource.MANUAL
  })
  assignmentSource: AssignmentSource;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Audyt
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedBy: User;

  @Column({ name: 'assigned_by', nullable: true })
  assignedById: number;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

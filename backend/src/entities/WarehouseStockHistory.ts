// src/entities/WarehouseStockHistory.ts
// Historia operacji magazynowych

import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { WarehouseStock } from './WarehouseStock';
import { User } from './User';

export enum StockOperationType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT',
  RESERVED = 'RESERVED',
  RESERVATION_RELEASED = 'RESERVATION_RELEASED',
  ASSIGNED_TO_SUBSYSTEM = 'ASSIGNED_TO_SUBSYSTEM',
  ASSIGNED_TO_TASK = 'ASSIGNED_TO_TASK',
  MAPPED_TO_BOM = 'MAPPED_TO_BOM',
  MAPPED_TO_WORKFLOW = 'MAPPED_TO_WORKFLOW',
  PRICE_UPDATE = 'PRICE_UPDATE',
  LOCATION_CHANGE = 'LOCATION_CHANGE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  IMPORT = 'IMPORT'
}

@Entity('warehouse_stock_history')
@Index(['warehouseStockId'])
@Index(['operationType'])
@Index(['performedAt'])
export class WarehouseStockHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => WarehouseStock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_stock_id' })
  warehouseStock: WarehouseStock;

  @Column({ name: 'warehouse_stock_id' })
  warehouseStockId: number;

  // Typ operacji
  @Column({
    name: 'operation_type',
    type: 'varchar',
    length: 50
  })
  operationType: StockOperationType;

  // Szczegóły operacji
  @Column({ name: 'quantity_change', type: 'decimal', precision: 10, scale: 2, nullable: true })
  quantityChange: number;

  @Column({ name: 'quantity_before', type: 'decimal', precision: 10, scale: 2, nullable: true })
  quantityBefore: number;

  @Column({ name: 'quantity_after', type: 'decimal', precision: 10, scale: 2, nullable: true })
  quantityAfter: number;

  // Referencje
  @Column({ name: 'reference_type', length: 50, nullable: true })
  referenceType: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: number;

  // Dodatkowe dane (JSONB)
  @Column({ type: 'jsonb', default: {} })
  details: any;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Audyt
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performed_by' })
  performedBy: User;

  @Column({ name: 'performed_by', nullable: true })
  performedById: number;

  @CreateDateColumn({ name: 'performed_at' })
  performedAt: Date;
}

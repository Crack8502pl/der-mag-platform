// src/entities/TaskWarehouseStock.ts
// Przypisanie materiałów do zadań

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
import { Task } from './Task';
import { WarehouseStock } from './WarehouseStock';
import { User } from './User';

export enum TaskStockStatus {
  PENDING = 'PENDING',
  RESERVED = 'RESERVED',
  ISSUED = 'ISSUED',
  COMPLETED = 'COMPLETED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED'
}

@Entity('task_warehouse_stock')
@Index(['taskId', 'warehouseStockId'], { unique: true })
export class TaskWarehouseStock {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'task_id' })
  taskId: number;

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

  @Column({ name: 'quantity_used', type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantityUsed: number;

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    default: TaskStockStatus.PENDING
  })
  status: TaskStockStatus;

  // Źródło przypisania
  @Column({
    name: 'assignment_source',
    type: 'varchar',
    length: 50,
    default: 'MANUAL'
  })
  assignmentSource: string;

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

// src/entities/TaskGeneratedBomItem.ts
// Per-task BOM item entity

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
import { TaskGeneratedBom } from './TaskGeneratedBom';
import { BomSubsystemTemplateItem } from './BomSubsystemTemplateItem';

@Entity('task_generated_bom_items')
@Index(['taskBomId'])
@Index(['requiresIp'])
export class TaskGeneratedBomItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TaskGeneratedBom, bom => bom.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_bom_id' })
  taskBom: TaskGeneratedBom;

  @Column({ type: 'int', name: 'task_bom_id' })
  taskBomId: number;

  @ManyToOne(() => BomSubsystemTemplateItem, { nullable: true })
  @JoinColumn({ name: 'template_item_id' })
  templateItem: BomSubsystemTemplateItem;

  @Column({ type: 'int', name: 'template_item_id', nullable: true })
  templateItemId: number;

  @Column({ name: 'item_name', type: 'varchar', length: 255 })
  itemName: string;

  @Column({ name: 'catalog_number', type: 'varchar', length: 100, nullable: true })
  catalogNumber: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: 'szt' })
  unit: string;

  @Column({ name: 'requires_ip', type: 'boolean', default: false })
  requiresIp: boolean;

  @Column({ name: 'requires_serial_number', type: 'boolean', default: false })
  requiresSerialNumber: boolean;

  @Column({ name: 'assigned_ip', type: 'varchar', length: 45, nullable: true })
  assignedIp: string;

  @Column({ name: 'scanned_quantity', type: 'int', default: 0 })
  scannedQuantity: number;

  @Column({ name: 'group_name', type: 'varchar', length: 100, nullable: true })
  groupName: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'device_category', type: 'varchar', length: 50, nullable: true })
  deviceCategory: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

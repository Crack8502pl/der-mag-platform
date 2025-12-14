// src/entities/BOMTemplate.ts
// Encja szablonu BOM (Bill of Materials)

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TaskType } from './TaskType';

@Entity('bom_templates')
export class BOMTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, nullable: true, default: () => 'gen_random_uuid()' })
  uuid?: string;

  @ManyToOne(() => TaskType, taskType => taskType.bomTemplates)
  @JoinColumn({ name: 'task_type_id' })
  taskType: TaskType;

  @Column({ name: 'task_type_id' })
  taskTypeId: number;

  @Column({ name: 'material_name', length: 200 })
  materialName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, nullable: true })
  unit: string;

  @Column({ name: 'default_quantity', type: 'decimal', precision: 10, scale: 2, default: 1 })
  defaultQuantity: number;

  @Column({ name: 'is_serialized', default: false })
  isSerialized: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ name: 'part_number', type: 'varchar', length: 100, nullable: true })
  partNumber: string;

  @Column({ name: 'catalog_number', type: 'varchar', length: 100, nullable: true })
  catalogNumber?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supplier?: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice?: number;

  @Column({ name: 'is_required', default: false })
  isRequired: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

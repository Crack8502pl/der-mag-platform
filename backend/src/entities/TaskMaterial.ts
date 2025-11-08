// src/entities/TaskMaterial.ts
// Encja materiałów przypisanych do zadania

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './Task';
import { BOMTemplate } from './BOMTemplate';

@Entity('task_materials')
export class TaskMaterial {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task, task => task.materials)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'task_id' })
  taskId: number;

  @ManyToOne(() => BOMTemplate)
  @JoinColumn({ name: 'bom_template_id' })
  bomTemplate: BOMTemplate;

  @Column({ name: 'bom_template_id' })
  bomTemplateId: number;

  @Column({ name: 'material_name', length: 200 })
  materialName: string;

  @Column({ name: 'planned_quantity', type: 'decimal', precision: 10, scale: 2 })
  plannedQuantity: number;

  @Column({ name: 'used_quantity', type: 'decimal', precision: 10, scale: 2, default: 0 })
  usedQuantity: number;

  @Column({ length: 50, nullable: true })
  unit: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'jsonb', default: [] })
  serialNumbers: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

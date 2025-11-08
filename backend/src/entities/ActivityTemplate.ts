// src/entities/ActivityTemplate.ts
// Encja szablonu aktywności (checklist)

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TaskType } from './TaskType';

@Entity('activity_templates')
@Index(['taskTypeId', 'sequence'])
export class ActivityTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TaskType, taskType => taskType.activityTemplates)
  @JoinColumn({ name: 'task_type_id' })
  taskType: TaskType;

  @Column({ name: 'task_type_id' })
  taskTypeId: number;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  sequence: number;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number;

  @ManyToOne(() => ActivityTemplate, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: ActivityTemplate;

  @Column({ name: 'requires_photo', default: false })
  requiresPhoto: boolean;

  @Column({ name: 'min_photos', type: 'int', default: 0 })
  minPhotos: number;

  @Column({ name: 'is_mandatory', default: true })
  isMandatory: boolean;

  @Column({ type: 'jsonb', default: {} })
  configuration: Record<string, any>;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

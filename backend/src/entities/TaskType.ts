// src/entities/TaskType.ts
// Encja typu zadania

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Task } from './Task';
import { BOMTemplate } from './BOMTemplate';
import { IPPool } from './IPPool';
import { ActivityTemplate } from './ActivityTemplate';

@Entity('task_types')
export class TaskType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'jsonb', default: {} })
  configuration: Record<string, any>;

  @OneToMany(() => Task, task => task.taskType)
  tasks: Task[];

  @OneToMany(() => BOMTemplate, template => template.taskType)
  bomTemplates: BOMTemplate[];

  @OneToMany(() => IPPool, pool => pool.taskType)
  ipPools: IPPool[];

  @OneToMany(() => ActivityTemplate, template => template.taskType)
  activityTemplates: ActivityTemplate[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

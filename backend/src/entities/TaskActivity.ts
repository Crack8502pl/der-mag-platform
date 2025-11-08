// src/entities/TaskActivity.ts
// Encja aktywności przypisanej do zadania

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './Task';
import { ActivityTemplate } from './ActivityTemplate';
import { User } from './User';

@Entity('task_activities')
export class TaskActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task, task => task.activities)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'task_id' })
  taskId: number;

  @ManyToOne(() => ActivityTemplate)
  @JoinColumn({ name: 'activity_template_id' })
  activityTemplate: ActivityTemplate;

  @Column({ name: 'activity_template_id' })
  activityTemplateId: number;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  sequence: number;

  @Column({ name: 'is_completed', default: false })
  isCompleted: boolean;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'completed_by' })
  completedBy: User;

  @Column({ name: 'completed_by', nullable: true })
  completedById: number;

  @Column({ name: 'requires_photo', default: false })
  requiresPhoto: boolean;

  @Column({ name: 'photo_count', type: 'int', default: 0 })
  photoCount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

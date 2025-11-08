// src/entities/TaskMetric.ts
// Encja metryk i statystyk zadania

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Task } from './Task';
import { User } from './User';

@Entity('task_metrics')
export class TaskMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task, task => task.metrics)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'task_id' })
  taskId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @Column({ name: 'metric_type', type: 'varchar', length: 50 })
  metricType: string;

  @Column({ name: 'metric_value', type: 'decimal', precision: 10, scale: 2 })
  metricValue: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'recorded_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

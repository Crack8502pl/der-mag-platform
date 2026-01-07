// src/entities/ServiceTaskActivity.ts
// Encja czynności wykonanych na zadaniu serwisowym

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ServiceTask } from './ServiceTask';
import { User } from './User';

@Entity('service_task_activities')
export class ServiceTaskActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ServiceTask)
  @JoinColumn({ name: 'service_task_id' })
  serviceTask: ServiceTask;

  @Column({ name: 'service_task_id' })
  serviceTaskId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'performed_by' })
  performedBy: User;

  @Column({ name: 'performed_by' })
  performedById: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'activity_type', length: 50 })
  activityType: string; // 'status_change', 'note', 'photo', 'material_used'

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({
    name: 'performed_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  performedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

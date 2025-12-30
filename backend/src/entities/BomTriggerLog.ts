// src/entities/BomTriggerLog.ts
// Encja logowania wykonania triggerów BOM

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BomTrigger } from './BomTrigger';
import { Task } from './Task';

@Entity('bom_trigger_logs')
@Index(['triggerId'])
@Index(['taskId'])
@Index(['executedAt'])
@Index(['success'])
export class BomTriggerLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => BomTrigger)
  @JoinColumn({ name: 'trigger_id' })
  trigger: BomTrigger;

  @Column({ name: 'trigger_id' })
  triggerId: number;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Column({ name: 'task_id', nullable: true })
  taskId?: number;

  @CreateDateColumn({ name: 'executed_at' })
  executedAt: Date;

  @Column({ default: true })
  success: boolean;

  @Column({ name: 'input_data', type: 'jsonb', default: {} })
  inputData: Record<string, any>;

  @Column({ name: 'result_data', type: 'jsonb', default: {} })
  resultData: Record<string, any>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;
}

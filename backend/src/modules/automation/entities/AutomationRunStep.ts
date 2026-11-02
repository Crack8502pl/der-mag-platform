// src/modules/automation/entities/AutomationRunStep.ts

import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AutomationRun } from './AutomationRun';

export type AutomationRunStepStatus = 'PENDING' | 'RETRY' | 'SUCCEEDED' | 'SKIPPED' | 'FAILED';

@Entity('automation_run_steps')
@Index('uq_automation_run_steps_idempotency', ['idempotencyKey'], { unique: true })
@Index('uq_automation_run_steps_index', ['runId', 'stepIndex'], { unique: true })
@Check('chk_automation_run_steps_status', `"status" IN ('PENDING', 'RETRY', 'SUCCEEDED', 'SKIPPED', 'FAILED')`)
export class AutomationRunStep {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'run_id', type: 'int' })
  runId: number;

  @ManyToOne(() => AutomationRun, run => run.steps, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'run_id' })
  run: AutomationRun;

  @Column({ name: 'step_index', type: 'int' })
  stepIndex: number;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  input: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: AutomationRunStepStatus;

  @Column({ type: 'int', default: 0 })
  attempt: number;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  /** run_id + step_index – krok już SUCCEEDED z tym kluczem nie jest wykonywany ponownie. */
  @Column({ name: 'idempotency_key', type: 'varchar', length: 100 })
  idempotencyKey: string;
}

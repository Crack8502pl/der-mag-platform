// src/modules/automation/entities/AutomationRun.ts
// Dziennik uruchomień łańcucha. Zdarzenie i dane wejściowe kroków są zapisywane w postaci zamaskowanej.

import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AutomationChain } from './AutomationChain';
import { AutomationRunStep } from './AutomationRunStep';

export type AutomationRunStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL' | 'BLOCKED';

@Entity('automation_runs')
@Index('idx_automation_runs_chain', ['chainId'])
@Check('chk_automation_runs_status', `"status" IN ('RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL', 'BLOCKED')`)
export class AutomationRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chain_id', type: 'int' })
  chainId: number;

  @ManyToOne(() => AutomationChain, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chain_id' })
  chain: AutomationChain;

  /** Identyfikator zdarzenia – to samo zdarzenie nie uruchamia łańcucha dwa razy. */
  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @Column({ type: 'jsonb' })
  event: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, default: 'RUNNING' })
  status: AutomationRunStatus;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'now()' })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @Column({ name: 'dry_run', type: 'boolean', default: false })
  dryRun: boolean;

  @Column({ name: 'causation_depth', type: 'int', default: 0 })
  causationDepth: number;

  /** Autor łańcucha w chwili uruchomienia. */
  @Column({ name: 'chain_author_id', type: 'int', nullable: true })
  chainAuthorId: number | null;

  /** Aktor zdarzenia (kto wywołał zdarzenie). */
  @Column({ name: 'actor_id', type: 'int', nullable: true })
  actorId: number | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @OneToMany(() => AutomationRunStep, step => step.run)
  steps: AutomationRunStep[];
}

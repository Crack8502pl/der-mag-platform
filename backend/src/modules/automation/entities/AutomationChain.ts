// src/modules/automation/entities/AutomationChain.ts
// Łańcuch automatyzacji: kroki (klocki z parametrami) wykonywane po zdarzeniu dla właściciela.

import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../../entities/User';
import type { AutomationOnError, AutomationStepDefinition } from '../contracts';

@Entity('automation_chains')
@Index('uq_automation_chains_owner_event', ['ownerType', 'ownerId', 'eventType'], { unique: true })
@Check('chk_automation_chains_on_error', `"on_error" IN ('STOP', 'CONTINUE')`)
export class AutomationChain {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'owner_type', type: 'varchar', length: 40 })
  ownerType: string;

  @Column({ name: 'owner_id', type: 'int' })
  ownerId: number;

  @Column({ name: 'event_type', type: 'varchar', length: 60 })
  eventType: string;

  @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
  steps: AutomationStepDefinition[];

  @Column({ name: 'on_error', type: 'varchar', length: 10, default: 'STOP' })
  onError: AutomationOnError;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

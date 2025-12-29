// src/entities/CompletionOrder.ts
// Encja zlecenia kompletacji

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Subsystem } from './Subsystem';
import { WorkflowGeneratedBom } from './WorkflowGeneratedBom';
import { User } from './User';
import { CompletionItem } from './CompletionItem';
import { Pallet } from './Pallet';

export enum CompletionOrderStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_DECISION = 'WAITING_DECISION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum CompletionDecision {
  CONTINUE_PARTIAL = 'CONTINUE_PARTIAL',
  WAIT_FOR_COMPLETE = 'WAIT_FOR_COMPLETE'
}

@Entity('completion_orders')
export class CompletionOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Subsystem)
  @JoinColumn({ name: 'subsystem_id' })
  subsystem: Subsystem;

  @Column({ name: 'subsystem_id' })
  subsystemId: number;

  @ManyToOne(() => WorkflowGeneratedBom)
  @JoinColumn({ name: 'generated_bom_id' })
  generatedBom: WorkflowGeneratedBom;

  @Column({ name: 'generated_bom_id' })
  generatedBomId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User;

  @Column({ name: 'assigned_to' })
  assignedToId: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: CompletionOrderStatus.CREATED
  })
  status: CompletionOrderStatus;

  @Column({ type: 'varchar', length: 30, nullable: true })
  decision: CompletionDecision;

  @Column({ name: 'decision_notes', type: 'text', nullable: true })
  decisionNotes: string;

  @Column({ name: 'decision_by', type: 'int', nullable: true })
  decisionBy: number; // user id

  @Column({ name: 'decision_at', type: 'timestamp', nullable: true })
  decisionAt: Date;

  @OneToMany(() => CompletionItem, item => item.completionOrder)
  items: CompletionItem[];

  @OneToMany(() => Pallet, pallet => pallet.completionOrder)
  pallets: Pallet[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;
}

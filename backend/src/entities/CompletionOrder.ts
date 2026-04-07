// src/entities/CompletionOrder.ts
// Encja zlecenia kompletacji

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, UpdateDateColumn } from 'typeorm';
import { Subsystem } from './Subsystem';
import { WorkflowGeneratedBom } from './WorkflowGeneratedBom';
import { User } from './User';
import { CompletionItem } from './CompletionItem';
import { Pallet } from './Pallet';

export enum CompletionOrderStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_MATERIALS = 'WAITING_FOR_MATERIALS',
  WAITING_DECISION = 'WAITING_DECISION',
  PARTIAL_PENDING_APPROVAL = 'PARTIAL_PENDING_APPROVAL',
  PARTIAL_ISSUED = 'PARTIAL_ISSUED',
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

  @Column({ type: 'int', name: 'subsystem_id' })
  subsystemId: number;

  @ManyToOne(() => WorkflowGeneratedBom, { nullable: true })
  @JoinColumn({ name: 'generated_bom_id' })
  generatedBom: WorkflowGeneratedBom | null;

  @Column({ type: 'int', name: 'generated_bom_id', nullable: true })
  generatedBomId: number | null;

  @Column({ name: 'task_number', type: 'varchar', length: 20, nullable: true })
  taskNumber: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User;

  @Column({ type: 'int', name: 'assigned_to' })
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

  @Column({ name: 'completed_by_id', type: 'int', nullable: true })
  completedById: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'completed_by_id' })
  completedBy: User | null;
}

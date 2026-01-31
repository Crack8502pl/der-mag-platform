// src/entities/SubsystemTask.ts
// Encja zadania podsystemu z pełnym trackingiem workflow

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Subsystem } from './Subsystem';
import { WorkflowGeneratedBom } from './WorkflowGeneratedBom';
import { CompletionOrder } from './CompletionOrder';
import { PrefabricationTask } from './PrefabricationTask';

export enum TaskWorkflowStatus {
  CREATED = 'CREATED',
  BOM_GENERATED = 'BOM_GENERATED',
  COMPLETION_ASSIGNED = 'COMPLETION_ASSIGNED',
  COMPLETION_IN_PROGRESS = 'COMPLETION_IN_PROGRESS',
  COMPLETION_COMPLETED = 'COMPLETION_COMPLETED',
  PREFABRICATION_ASSIGNED = 'PREFABRICATION_ASSIGNED',
  PREFABRICATION_IN_PROGRESS = 'PREFABRICATION_IN_PROGRESS',
  PREFABRICATION_COMPLETED = 'PREFABRICATION_COMPLETED',
  READY_FOR_DEPLOYMENT = 'READY_FOR_DEPLOYMENT',
  DEPLOYED = 'DEPLOYED',
  VERIFIED = 'VERIFIED',
  CANCELLED = 'CANCELLED'
}

@Entity('subsystem_tasks')
@Index(['taskNumber'], { unique: true })
@Index(['subsystemId'])
@Index(['status'])
export class SubsystemTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'subsystem_id' })
  subsystemId: number;

  @ManyToOne(() => Subsystem)
  @JoinColumn({ name: 'subsystem_id' })
  subsystem: Subsystem;

  @Column({ name: 'task_number', type: 'varchar', length: 20, unique: true })
  taskNumber: string;  // Format: ZXXXXMMRR (zunifikowany z Task)

  @Column({ name: 'task_name', type: 'varchar', length: 255 })
  taskName: string;

  @Column({ name: 'task_type', type: 'varchar', length: 100 })
  taskType: string;  // PRZEJAZD_KAT_A, SKP, BUDYNEK, etc.

  @Column({ name: 'status', type: 'varchar', length: 50, default: TaskWorkflowStatus.CREATED })
  status: TaskWorkflowStatus;

  // BOM tracking
  @Column({ name: 'bom_generated', type: 'boolean', default: false })
  bomGenerated: boolean;

  @Column({ name: 'bom_id', nullable: true })
  bomId: number | null;

  @ManyToOne(() => WorkflowGeneratedBom, { nullable: true })
  @JoinColumn({ name: 'bom_id' })
  bom: WorkflowGeneratedBom | null;

  // Completion tracking
  @Column({ name: 'completion_order_id', nullable: true })
  completionOrderId: number | null;

  @ManyToOne(() => CompletionOrder, { nullable: true })
  @JoinColumn({ name: 'completion_order_id' })
  completionOrder: CompletionOrder | null;

  @Column({ name: 'completion_started_at', type: 'timestamp', nullable: true })
  completionStartedAt: Date | null;

  @Column({ name: 'completion_completed_at', type: 'timestamp', nullable: true })
  completionCompletedAt: Date | null;

  // Prefabrication tracking
  @Column({ name: 'prefabrication_task_id', nullable: true })
  prefabricationTaskId: number | null;

  @ManyToOne(() => PrefabricationTask, { nullable: true })
  @JoinColumn({ name: 'prefabrication_task_id' })
  prefabricationTask: PrefabricationTask | null;

  @Column({ name: 'prefabrication_started_at', type: 'timestamp', nullable: true })
  prefabricationStartedAt: Date | null;

  @Column({ name: 'prefabrication_completed_at', type: 'timestamp', nullable: true })
  prefabricationCompletedAt: Date | null;

  // Deployment tracking
  @Column({ name: 'deployment_scheduled_at', type: 'timestamp', nullable: true })
  deploymentScheduledAt: Date | null;

  @Column({ name: 'deployment_completed_at', type: 'timestamp', nullable: true })
  deploymentCompletedAt: Date | null;

  // Verification
  @Column({ name: 'verification_completed_at', type: 'timestamp', nullable: true })
  verificationCompletedAt: Date | null;

  // Realization tracking
  @Column({ name: 'realization_started_at', type: 'timestamp', nullable: true })
  realizationStartedAt: Date | null;

  @Column({ name: 'realization_completed_at', type: 'timestamp', nullable: true })
  realizationCompletedAt: Date | null;

  // Metadata
  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

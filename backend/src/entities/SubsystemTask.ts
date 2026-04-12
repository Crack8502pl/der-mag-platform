// src/entities/SubsystemTask.ts
// Encja zadania podsystemu z pełnym trackingiem workflow

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Subsystem } from './Subsystem';
import { WorkflowGeneratedBom } from './WorkflowGeneratedBom';
import { CompletionOrder } from './CompletionOrder';
import { PrefabricationTask } from './PrefabricationTask';
import { TaskGeneratedBom } from './TaskGeneratedBom';
import { Asset, AssetTaskRole } from './Asset';

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
@Index(['substatus'])
export class SubsystemTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'subsystem_id' })
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

  @Column({ name: 'substatus', type: 'varchar', length: 50, nullable: true })
  substatus: string | null;

  // BOM tracking
  @Column({ name: 'bom_generated', type: 'boolean', default: false })
  bomGenerated: boolean;

  @Column({ type: 'int', name: 'bom_id', nullable: true })
  bomId: number | null;

  @ManyToOne(() => WorkflowGeneratedBom, { nullable: true })
  @JoinColumn({ name: 'bom_id' })
  bom: WorkflowGeneratedBom | null;

  @Column({ type: 'int', name: 'task_bom_id', nullable: true })
  taskBomId: number | null;

  @ManyToOne(() => TaskGeneratedBom, { nullable: true })
  @JoinColumn({ name: 'task_bom_id' })
  taskBom: TaskGeneratedBom | null;

  // Completion tracking
  @Column({ type: 'int', name: 'completion_order_id', nullable: true })
  completionOrderId: number | null;

  @ManyToOne(() => CompletionOrder, { nullable: true })
  @JoinColumn({ name: 'completion_order_id' })
  completionOrder: CompletionOrder | null;

  @Column({ name: 'completion_started_at', type: 'timestamp', nullable: true })
  completionStartedAt: Date | null;

  @Column({ name: 'completion_completed_at', type: 'timestamp', nullable: true })
  completionCompletedAt: Date | null;

  // Prefabrication tracking
  @Column({ type: 'int', name: 'prefabrication_task_id', nullable: true })
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

  // Asset Management relations
  @ManyToOne(() => Asset, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linked_asset_id' })
  linkedAsset: Asset | null;

  @Column({ name: 'linked_asset_id', type: 'int', nullable: true })
  linkedAssetId: number | null;

  @Column({ name: 'task_role', type: 'varchar', length: 50, nullable: true })
  taskRole: AssetTaskRole | null; // installation, warranty_service, repair, maintenance, decommission

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

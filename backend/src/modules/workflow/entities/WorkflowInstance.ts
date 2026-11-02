import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { WorkflowSubjectType } from '../contracts';

export type WorkflowInstanceStatus = 'RUNNING' | 'COMPLETED' | 'CANCELLED';

@Entity('workflow_instances')
@Index('uq_workflow_instances_running', ['definitionId', 'subjectType', 'subjectId'], { unique: true, where: `"status" = 'RUNNING'` })
export class WorkflowInstance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'definition_id', type: 'int' })
  definitionId: number;

  @Column({ name: 'version_id', type: 'int' })
  versionId: number;

  @Column({ name: 'subject_type', type: 'varchar', length: 20 })
  subjectType: WorkflowSubjectType;

  @Column({ name: 'subject_id', type: 'int' })
  subjectId: number;

  @Column({ type: 'varchar', length: 20, default: 'RUNNING' })
  status: WorkflowInstanceStatus;

  @Column({ name: 'current_step_key', type: 'varchar', length: 100, nullable: true })
  currentStepKey: string | null;

  @Column({ name: 'current_step_run_id', type: 'int', nullable: true })
  currentStepRunId: number | null;

  @Column({ name: 'started_by_id', type: 'int', nullable: true })
  startedById: number | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'cancelled_reason', type: 'text', nullable: true })
  cancelledReason: string | null;

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

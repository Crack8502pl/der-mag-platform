import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import type { WorkflowAssigneeType } from '../contracts';

export type WorkflowStepOutcome = 'COMPLETED' | 'RETURNED' | 'FORCED' | 'CANCELLED';

@Entity('workflow_step_runs')
@Unique('uq_workflow_step_runs_attempt', ['instanceId', 'stepKey', 'attempt'])
export class WorkflowStepRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'instance_id', type: 'int' })
  instanceId: number;

  @Column({ name: 'step_id', type: 'int' })
  stepId: number;

  @Column({ name: 'step_key', type: 'varchar', length: 100 })
  stepKey: string;

  @Column({ type: 'int' })
  attempt: number;

  @Column({ name: 'assignee_type', type: 'varchar', length: 30 })
  assigneeType: WorkflowAssigneeType;

  @Column({ name: 'assigned_user_id', type: 'int', nullable: true })
  assignedUserId: number | null;

  @Column({ name: 'assigned_group_type', type: 'varchar', length: 30, nullable: true })
  assignedGroupType: 'ROLE' | 'FUNCTION_GROUP' | 'BRIGADE' | null;

  @Column({ name: 'assigned_group_ref', type: 'varchar', length: 100, nullable: true })
  assignedGroupRef: string | null;

  @Column({ name: 'form_instance_id', type: 'int', nullable: true })
  formInstanceId: number | null;

  @Column({ name: 'form_template_version_id', type: 'int', nullable: true })
  formTemplateVersionId: number | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'completed_by_id', type: 'int', nullable: true })
  completedById: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  outcome: WorkflowStepOutcome | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}

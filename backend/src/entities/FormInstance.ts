import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index, Unique, Check } from 'typeorm';
import { FormTemplateVersion } from './FormTemplateVersion';
import { FormFieldValue } from './FormFieldValue';
import { FormApproval } from './FormApproval';
import { Contract } from './Contract';
import { Task } from './Task';
import { SubsystemTask } from './SubsystemTask';
import { Asset } from './Asset';
import { Device } from './Device';
import { TaskGeneratedBomItem } from './TaskGeneratedBomItem';
import { WorkflowGeneratedBomItem } from './WorkflowGeneratedBomItem';
import { User } from './User';
import { Brigade } from './Brigade';
import { FormInstanceStatus } from './FormTypes';

@Entity('form_instances')
@Unique('uq_form_instance_version', ['id', 'templateVersionId'])
@Index('idx_form_instances_version', ['templateVersionId'])
@Index('idx_form_instances_contract', ['contractId'])
@Index('idx_form_instances_task', ['taskId'])
@Index('idx_form_instances_subsystem_task', ['subsystemTaskId'])
@Index('idx_form_instances_object', ['objectId'])
@Index('idx_form_instances_device', ['deviceId'])
@Index('idx_form_instances_bom_item', ['bomItemId'])
@Index('idx_form_instances_workflow_bom_item', ['workflowBomItemId'])
@Index('idx_form_instances_user_status', ['assignedUserId', 'status'])
@Index('idx_form_instances_team_status', ['assignedTeamId', 'status'])
@Check('chk_form_instance_status', `"status" IN ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED')`)
@Check('chk_form_instance_bom', `"bom_item_id" IS NULL OR "workflow_bom_item_id" IS NULL`)
export class FormInstance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_version_id', type: 'int' })
  templateVersionId: number;

  @ManyToOne(() => FormTemplateVersion, version => version.instances, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_version_id' })
  templateVersion: FormTemplateVersion;

  @Column({ type: 'varchar', length: 20, default: FormInstanceStatus.DRAFT })
  status: FormInstanceStatus;

  @Column({ name: 'contract_id', type: 'int', nullable: true })
  contractId: number | null;

  @ManyToOne(() => Contract, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract | null;

  @Column({ name: 'task_id', type: 'int', nullable: true })
  taskId: number | null;

  @ManyToOne(() => Task, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'task_id' })
  task: Task | null;

  @Column({ name: 'subsystem_task_id', type: 'int', nullable: true })
  subsystemTaskId: number | null;

  @ManyToOne(() => SubsystemTask, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subsystem_task_id' })
  subsystemTask: SubsystemTask | null;

  @Column({ name: 'object_id', type: 'int', nullable: true })
  objectId: number | null;

  @ManyToOne(() => Asset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'object_id' })
  object: Asset | null;

  @Column({ name: 'device_id', type: 'int', nullable: true })
  deviceId: number | null;

  @ManyToOne(() => Device, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'device_id' })
  device: Device | null;

  @Column({ name: 'bom_item_id', type: 'int', nullable: true })
  bomItemId: number | null;

  @ManyToOne(() => TaskGeneratedBomItem, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bom_item_id' })
  bomItem: TaskGeneratedBomItem | null;

  @Column({ name: 'workflow_bom_item_id', type: 'int', nullable: true })
  workflowBomItemId: number | null;

  @ManyToOne(() => WorkflowGeneratedBomItem, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'workflow_bom_item_id' })
  workflowBomItem: WorkflowGeneratedBomItem | null;

  @Column({ name: 'assigned_user_id', type: 'int', nullable: true })
  assignedUserId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assigned_user_id' })
  assignedUser: User | null;

  @Column({ name: 'assigned_team_id', type: 'int', nullable: true })
  assignedTeamId: number | null;

  @ManyToOne(() => Brigade, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assigned_team_id' })
  assignedTeam: Brigade | null;

  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => FormFieldValue, value => value.instance)
  values: FormFieldValue[];

  @OneToMany(() => FormApproval, approval => approval.instance)
  approvals: FormApproval[];
}

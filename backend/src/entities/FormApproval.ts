import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Check } from 'typeorm';
import { FormInstance } from './FormInstance';
import { User } from './User';
import { FormApprovalDecision, FormJsonObject } from './FormTypes';

@Entity('form_approvals')
@Index('idx_form_approvals_stage', ['instanceId', 'round', 'stepOrder'])
@Check('chk_form_approval_stage', `"round" > 0 AND "step_order" > 0`)
@Check('chk_form_approval_decision', `"decision" IN ('APPROVED', 'REJECTED')`)
export class FormApproval {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'instance_id', type: 'int' })
  instanceId: number;

  @ManyToOne(() => FormInstance, instance => instance.approvals, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'instance_id' })
  instance: FormInstance;

  @Column({ name: 'step_key', type: 'varchar', length: 100, default: 'approval' })
  stepKey: string;

  @Column({ name: 'step_order', type: 'int', default: 1 })
  stepOrder: number;

  @Column({ type: 'int', default: 1 })
  round: number;

  @Column({ type: 'varchar', length: 20 })
  decision: FormApprovalDecision;

  @Column({ name: 'decided_by_id', type: 'int' })
  decidedById: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'decided_by_id' })
  decidedBy: User;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: FormJsonObject;

  @CreateDateColumn({ name: 'decided_at' })
  decidedAt: Date;
}

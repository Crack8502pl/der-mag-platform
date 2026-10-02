import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, Check } from 'typeorm';
import { FormTemplateVersion } from './FormTemplateVersion';
import { FormTrigger } from './FormTrigger';
import { User } from './User';
import { Brigade } from './Brigade';
import { FormJsonObject } from './FormTypes';

@Entity('form_assignment_rules')
@Index('idx_form_assignment_rules_version', ['templateVersionId', 'priority'])
@Index('idx_form_assignment_rules_trigger', ['triggerId'])
@Check('chk_form_assignment_target', `"assigned_user_id" IS NOT NULL OR "assigned_team_id" IS NOT NULL`)
export class FormAssignmentRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_version_id', type: 'int' })
  templateVersionId: number;

  @ManyToOne(() => FormTemplateVersion, version => version.assignmentRules, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_version_id' })
  templateVersion: FormTemplateVersion;

  @Column({ name: 'trigger_id', type: 'int', nullable: true })
  triggerId: number | null;

  @ManyToOne(() => FormTrigger, trigger => trigger.assignmentRules, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'trigger_id', referencedColumnName: 'id' },
    { name: 'template_version_id', referencedColumnName: 'templateVersionId' }
  ])
  trigger: FormTrigger | null;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'jsonb', default: {} })
  conditions: FormJsonObject;

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
}

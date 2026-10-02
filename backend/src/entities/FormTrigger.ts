import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, Unique, Index } from 'typeorm';
import { FormTemplateVersion } from './FormTemplateVersion';
import { FormAssignmentRule } from './FormAssignmentRule';
import { FormJsonObject } from './FormTypes';

@Entity('form_triggers')
@Unique('uq_form_trigger_version', ['id', 'templateVersionId'])
@Index('idx_form_triggers_version', ['templateVersionId'])
@Index('idx_form_triggers_event', ['eventType', 'active'])
export class FormTrigger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_version_id', type: 'int' })
  templateVersionId: number;

  @ManyToOne(() => FormTemplateVersion, version => version.triggers, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_version_id' })
  templateVersion: FormTemplateVersion;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'jsonb', default: {} })
  conditions: FormJsonObject;

  @OneToMany(() => FormAssignmentRule, rule => rule.trigger)
  assignmentRules: FormAssignmentRule[];
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn, Unique, Check } from 'typeorm';
import { FormTemplate } from './FormTemplate';
import { FormSection } from './FormSection';
import { FormFieldDefinition } from './FormFieldDefinition';
import { FormTrigger } from './FormTrigger';
import { FormAssignmentRule } from './FormAssignmentRule';
import { FormInstance } from './FormInstance';
import { User } from './User';
import { FormJsonObject, FormKind, FormProcedureType, FormVersionStatus } from './FormTypes';

@Entity('form_template_versions')
@Unique('uq_form_template_version', ['templateId', 'version'])
@Check('chk_form_version_number', `"version" > 0`)
@Check('chk_form_version_publication', `("status" = 'DRAFT' AND "published_at" IS NULL) OR ("status" = 'PUBLISHED' AND "published_at" IS NOT NULL)`)
@Check('chk_form_version_kind', `"kind" IN ('FORM', 'CHECKLIST')`)
@Check('chk_form_version_procedure', `"procedure_type" IN ('CABINET_PREFABRICATION', 'DEVICE_PRECONFIGURATION', 'FIELD_INSTALLATION')`)
export class FormTemplateVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_id', type: 'int' })
  templateId: number;

  @ManyToOne(() => FormTemplate, template => template.versions, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_id' })
  template: FormTemplate;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 20, default: FormVersionStatus.DRAFT })
  status: FormVersionStatus;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20 })
  kind: FormKind;

  @Column({ name: 'procedure_type', type: 'varchar', length: 40 })
  procedureType: FormProcedureType;

  @Column({ type: 'jsonb', default: {} })
  settings: FormJsonObject;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => FormSection, section => section.templateVersion)
  sections: FormSection[];

  @OneToMany(() => FormFieldDefinition, field => field.templateVersion)
  fields: FormFieldDefinition[];

  @OneToMany(() => FormTrigger, trigger => trigger.templateVersion)
  triggers: FormTrigger[];

  @OneToMany(() => FormAssignmentRule, rule => rule.templateVersion)
  assignmentRules: FormAssignmentRule[];

  @OneToMany(() => FormInstance, instance => instance.templateVersion)
  instances: FormInstance[];
}

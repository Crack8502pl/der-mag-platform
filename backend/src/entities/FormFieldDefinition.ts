import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { FormTemplateVersion } from './FormTemplateVersion';
import { FormSection } from './FormSection';
import { FormJsonObject } from './FormTypes';

@Entity('form_field_definitions')
@Unique('uq_form_field_key', ['templateVersionId', 'key'])
@Unique('uq_form_field_version', ['id', 'templateVersionId'])
@Index('idx_form_fields_order', ['sectionId', 'sortOrder'])
export class FormFieldDefinition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_version_id', type: 'int' })
  templateVersionId: number;

  @ManyToOne(() => FormTemplateVersion, version => version.fields, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_version_id' })
  templateVersion: FormTemplateVersion;

  @Column({ name: 'section_id', type: 'int' })
  sectionId: number;

  @ManyToOne(() => FormSection, section => section.fields, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'section_id', referencedColumnName: 'id' },
    { name: 'template_version_id', referencedColumnName: 'templateVersionId' }
  ])
  section: FormSection;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ name: 'field_type', type: 'varchar', length: 100 })
  fieldType: string;

  @Column({ type: 'boolean', default: false })
  required: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', default: {} })
  validation: FormJsonObject;

  @Column({ type: 'jsonb', default: {} })
  options: FormJsonObject;

  @Column({ type: 'jsonb', default: {} })
  conditions: FormJsonObject;
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, Unique, Index } from 'typeorm';
import { FormTemplateVersion } from './FormTemplateVersion';
import { FormFieldDefinition } from './FormFieldDefinition';
import { FormJsonObject } from './FormTypes';

@Entity('form_sections')
@Unique('uq_form_section_key', ['templateVersionId', 'key'])
@Unique('uq_form_section_version', ['id', 'templateVersionId'])
@Index('idx_form_sections_order', ['templateVersionId', 'sortOrder'])
export class FormSection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_version_id', type: 'int' })
  templateVersionId: number;

  @ManyToOne(() => FormTemplateVersion, version => version.sections, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_version_id' })
  templateVersion: FormTemplateVersion;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', default: {} })
  conditions: FormJsonObject;

  @OneToMany(() => FormFieldDefinition, field => field.section)
  fields: FormFieldDefinition[];
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinColumn, JoinTable, Unique, Index } from 'typeorm';
import { FormInstance } from './FormInstance';
import { FormFieldDefinition } from './FormFieldDefinition';
import { Document } from './Document';
import { Photo } from './Photo';
import { User } from './User';
import { FormJsonValue } from './FormTypes';

@Entity('form_field_values')
@Unique('uq_form_field_value', ['instanceId', 'fieldDefinitionId'])
@Index('idx_form_values_field', ['fieldDefinitionId', 'templateVersionId'])
export class FormFieldValue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'instance_id', type: 'int' })
  instanceId: number;

  @Column({ name: 'template_version_id', type: 'int' })
  templateVersionId: number;

  @ManyToOne(() => FormInstance, instance => instance.values, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'instance_id', referencedColumnName: 'id' },
    { name: 'template_version_id', referencedColumnName: 'templateVersionId' }
  ])
  instance: FormInstance;

  @Column({ name: 'field_definition_id', type: 'int' })
  fieldDefinitionId: number;

  @ManyToOne(() => FormFieldDefinition, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'field_definition_id', referencedColumnName: 'id' },
    { name: 'template_version_id', referencedColumnName: 'templateVersionId' }
  ])
  fieldDefinition: FormFieldDefinition;

  @Column({ type: 'jsonb', nullable: true })
  value: FormJsonValue;

  @ManyToMany(() => Document, { onDelete: 'RESTRICT' })
  @JoinTable({
    name: 'form_value_documents',
    joinColumn: { name: 'field_value_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'document_id', referencedColumnName: 'id' }
  })
  documents: Document[];

  @ManyToMany(() => Photo, { onDelete: 'RESTRICT' })
  @JoinTable({
    name: 'form_value_photos',
    joinColumn: { name: 'field_value_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'photo_id', referencedColumnName: 'id' }
  })
  photos: Photo[];

  @Column({ name: 'updated_by_id', type: 'int', nullable: true })
  updatedById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

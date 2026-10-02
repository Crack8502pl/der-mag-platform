import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Check } from 'typeorm';
import { User } from './User';
import { FormTemplateVersion } from './FormTemplateVersion';
import { FormKind, FormProcedureType } from './FormTypes';

@Entity('form_templates')
@Check('chk_form_templates_kind', `"kind" IN ('FORM', 'CHECKLIST')`)
@Check('chk_form_templates_procedure', `"procedure_type" IN ('CABINET_PREFABRICATION', 'DEVICE_PRECONFIGURATION', 'FIELD_INSTALLATION')`)
export class FormTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: FormKind.FORM })
  kind: FormKind;

  @Column({ name: 'procedure_type', type: 'varchar', length: 40 })
  procedureType: FormProcedureType;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @OneToMany(() => FormTemplateVersion, version => version.template)
  versions: FormTemplateVersion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

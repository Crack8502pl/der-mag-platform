import {
  Check, Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from './User';
import { FormJsonObject } from './FormTypes';

export type FormBrandingKind = 'HEADER' | 'FOOTER';
export type FormBrandingMode = 'FILE' | 'CUSTOM';

@Entity('form_header_footers')
@Check('chk_form_branding_kind', `"kind" IN ('HEADER', 'FOOTER')`)
@Check('chk_form_branding_mode', `"mode" IN ('FILE', 'CUSTOM')`)
@Check('chk_form_branding_height', '"height_mm" BETWEEN 5 AND 100')
@Check(
  'chk_form_branding_content',
  `("mode" = 'FILE' AND "file_path" IS NOT NULL AND "file_mime" IS NOT NULL AND "layout" IS NULL)
   OR ("mode" = 'CUSTOM' AND "file_path" IS NULL AND "file_mime" IS NULL AND "layout" IS NOT NULL)`,
)
@Index('uq_form_branding_default_kind', ['kind'], { unique: true, where: '"is_default" = TRUE AND "deleted_at" IS NULL' })
export class FormHeaderFooter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 10 })
  kind: FormBrandingKind;

  @Column({ type: 'varchar', length: 10 })
  mode: FormBrandingMode;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'height_mm', type: 'numeric', precision: 5, scale: 2, default: 20 })
  heightMm: number;

  @Column({ name: 'file_path', type: 'text', nullable: true })
  filePath: string | null;

  @Column({ name: 'file_mime', type: 'varchar', length: 100, nullable: true })
  fileMime: string | null;

  @Column({ type: 'jsonb', nullable: true })
  layout: FormJsonObject | null;

  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}

// src/modules/workflow/entities/WorkflowDefinition.ts
// Definicja procesu: czego dotyczy i dla jakich typów zadań. Treść procesu leży w wersjach.

import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { WorkflowSubjectType } from '../contracts';

@Entity('workflow_definitions')
@Index('uq_workflow_definitions_key', ['key'], { unique: true })
@Check('chk_workflow_definitions_subject_type', `"subject_type" IN ('TASK', 'CONTRACT', 'DEVICE')`)
export class WorkflowDefinition {
  @PrimaryGeneratedColumn()
  id: number;

  /** Unikalny klucz generowany z nazwy przy utworzeniu (nie zmienia się). */
  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'subject_type', type: 'varchar', length: 20 })
  subjectType: WorkflowSubjectType;

  /** Dla TASK: których typów zadań dotyczy proces. */
  @Column({ name: 'task_type_ids', type: 'int', array: true, default: () => `'{}'` })
  taskTypeIds: number[];

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdById: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

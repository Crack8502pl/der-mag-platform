// src/modules/workflow/entities/WorkflowStep.ts
// Etap wersji procesu: kto wykonuje, jaki formularz, w jakim terminie.

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { WorkflowAssigneeType } from '../contracts';

@Entity('workflow_steps')
export class WorkflowStep {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_id', type: 'int' })
  versionId: number;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  @Column({ name: 'assignee_type', type: 'varchar', length: 30, nullable: true })
  assigneeType: WorkflowAssigneeType | null;

  /** Identyfikator (ROLE, BRIGADE, USER) albo klucz (FUNCTION_GROUP); puste dla SUBJECT_ASSIGNEE. */
  @Column({ name: 'assignee_ref', type: 'varchar', length: 100, nullable: true })
  assigneeRef: string | null;

  @Column({ name: 'form_template_id', type: 'int', nullable: true })
  formTemplateId: number | null;

  @Column({ name: 'due_in_hours', type: 'int', nullable: true })
  dueInHours: number | null;
}

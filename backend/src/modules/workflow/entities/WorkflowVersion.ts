// src/modules/workflow/entities/WorkflowVersion.ts
// Wersja procesu: DRAFT (edytowalna) → PUBLISHED → SUPERSEDED. Wersja opublikowana i zastąpiona jest niezmienna.

import { Check, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { ReviewConfig, WorkflowVersionStatus } from '../contracts';

@Entity('workflow_versions')
@Unique('uq_workflow_versions_definition_version', ['definitionId', 'version'])
@Check('chk_workflow_versions_status', `"status" IN ('DRAFT', 'PUBLISHED', 'SUPERSEDED')`)
export class WorkflowVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'definition_id', type: 'int' })
  definitionId: number;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 30, default: 'DRAFT' })
  status: WorkflowVersionStatus;

  @Column({ name: 'author_id', type: 'int', nullable: true })
  authorId: number | null;

  /** Wyliczane: którykolwiek typ zadania procesu ma configuration.safetyCritical = true. */
  @Column({ name: 'safety_critical', type: 'boolean', default: false })
  safetyCritical: boolean;

  @Column({ name: 'allow_skip_purpose_audit', type: 'boolean', default: false })
  allowSkipPurposeAudit: boolean;

  /** { purpose: { functionKey, minApprovals }, technical: { functionKey, minApprovals } } – użyje W5a. */
  @Column({ name: 'review_config', type: 'jsonb', default: () => `'{}'::jsonb` })
  reviewConfig: ReviewConfig;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'published_by_id', type: 'int', nullable: true })
  publishedById: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

// src/modules/workflow/services/workflowAudit.ts
// Dziennik audytowy procesów: każda zmiana definicji i wersji roboczej trafia do audit_logs (kto, co, przed/po).

import type { EntityManager } from 'typeorm';

export type WorkflowAuditEvent =
  | 'WORKFLOW_DEFINITION_CREATED'
  | 'WORKFLOW_DEFINITION_UPDATED'
  | 'WORKFLOW_DEFINITION_DELETED'
  | 'WORKFLOW_DRAFT_UPDATED'
  | 'WORKFLOW_STEP_CHAIN_UPDATED'
  | 'WORKFLOW_VERSION_CREATED'
  | 'WORKFLOW_VERSION_PUBLISHED'
  | 'WORKFLOW_VERSION_SUPERSEDED'
  | 'WORKFLOW_SAFETY_RECALCULATED'
  | 'WORKFLOW_INSTANCE_STARTED'
  | 'WORKFLOW_INSTANCE_COMPLETED'
  | 'WORKFLOW_INSTANCE_CANCELLED'
  | 'WORKFLOW_STEP_ENTERED'
  | 'WORKFLOW_STEP_COMPLETED'
  | 'WORKFLOW_STEP_FORCED'
  | 'SAFETY_SKIP_ENABLED'
  | 'TASK_TYPE_SAFETY_CRITICAL_CHANGED';

export type WorkflowAuditTarget = 'workflow_definition' | 'workflow_version' | 'workflow_instance' | 'task_type';

export async function recordWorkflowAudit(
  manager: Pick<EntityManager, 'query'>,
  eventType: WorkflowAuditEvent,
  actorId: number | null,
  targetType: WorkflowAuditTarget,
  details: Record<string, unknown>,
): Promise<void> {
  await manager.query(
    `INSERT INTO audit_logs (event_type, user_id, details, created_at)
     VALUES ($1, $2, $3::jsonb, NOW())`,
    [eventType, actorId, JSON.stringify({ targetType, ...details })],
  );
}

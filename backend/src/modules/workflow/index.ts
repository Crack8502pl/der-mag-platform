/**
 * Procesy (workflow) – public API
 *
 * Procesy są opisane danymi: definicja → wersje (DRAFT → PUBLISHED → SUPERSEDED) → etapy i przejścia.
 * W3a: definicje, wersje, walidacja i publikacja. Realizacje (W3b), interfejs (W4) i przeglądy (W5) – osobno.
 */
export * from './contracts';
export { WorkflowError } from './errors';
export { WorkflowDefinition } from './entities/WorkflowDefinition';
export { WorkflowVersion } from './entities/WorkflowVersion';
export { WorkflowStep } from './entities/WorkflowStep';
export { WorkflowTransition } from './entities/WorkflowTransition';
export { WorkflowService, workflowService, isEditableStatus, EDITABLE_VERSION_STATUSES } from './services/WorkflowService';
export type { WorkflowActor } from './services/WorkflowService';
export { TaskTypeSafetyService, taskTypeSafetyService } from './services/TaskTypeSafetyService';
export { validateWorkflowVersion } from './validation/validateWorkflowVersion';
export { default as workflowRoutes } from './routes/workflow.routes';
export { default as taskTypeSafetyRoutes } from './routes/taskTypeSafety.routes';
export { WorkflowInstance } from './entities/WorkflowInstance';
export { WorkflowStepRun } from './entities/WorkflowStepRun';
export { WorkflowInstanceService, workflowInstances } from './services/WorkflowInstanceService';
export type { WorkflowInstanceFilters } from './services/WorkflowInstanceService';
export { default as workflowInstanceRoutes } from './routes/workflowInstance.routes';

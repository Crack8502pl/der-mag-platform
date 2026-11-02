// src/modules/workflow/contracts.ts
// Procesy opisane danymi: stałe i typy definicji, wersji, etapów i przejść.

import { AUTOMATION_OWNER_EVENTS, type AutomationOwnerType } from '../automation/contracts';

export const WORKFLOW_SUBJECT_TYPES = ['TASK', 'CONTRACT', 'DEVICE'] as const;
export type WorkflowSubjectType = typeof WORKFLOW_SUBJECT_TYPES[number];

/** W5a doda statusy przeglądu. */
export const WORKFLOW_VERSION_STATUSES = ['DRAFT', 'PUBLISHED', 'SUPERSEDED'] as const;
export type WorkflowVersionStatus = typeof WORKFLOW_VERSION_STATUSES[number];

export const WORKFLOW_ASSIGNEE_TYPES = ['ROLE', 'FUNCTION_GROUP', 'BRIGADE', 'USER', 'SUBJECT_ASSIGNEE'] as const;
export type WorkflowAssigneeType = typeof WORKFLOW_ASSIGNEE_TYPES[number];

/** Właściciel łańcucha automatyzacji etapu (automation_chains.owner_type) i zdarzenia etapu. */
export const WORKFLOW_STEP_OWNER: AutomationOwnerType = 'WORKFLOW_STEP';
export const WORKFLOW_STEP_EVENTS = AUTOMATION_OWNER_EVENTS.WORKFLOW_STEP;

export interface ReviewStageConfig {
  functionKey: string;
  minApprovals: number;
}

export interface ReviewConfig {
  purpose: ReviewStageConfig;
  technical: ReviewStageConfig;
}

export const REVIEW_STAGES = ['purpose', 'technical'] as const;
export type ReviewStage = typeof REVIEW_STAGES[number];

export const REVIEW_STAGE_LABELS: Record<ReviewStage, string> = {
  purpose: 'Audyt celowości',
  technical: 'Przegląd techniczny',
};

export const DEFAULT_REVIEW_CONFIG: ReviewConfig = {
  purpose: { functionKey: 'PROCESS_AUDITORS', minApprovals: 1 },
  technical: { functionKey: 'TECHNICAL_REVIEW', minApprovals: 1 },
};

/** Minimalna długość uzasadnienia włączenia pomijania audytu celowości w procesie krytycznym. */
export const SKIP_JUSTIFICATION_MIN_LENGTH = 20;

export const SAFETY_SKIP_WARNING =
  'Proces dotyczy systemu krytycznego dla bezpieczeństwa (SSP/SUG). Pominięcie audytu celowości jest odradzane.';

export const MAX_WORKFLOW_STEPS = 100;
export const MAX_WORKFLOW_TRANSITIONS = 200;
export const STEP_KEY_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

/** Gdzie w kreatorze leży problem – pozwala interfejsowi przejść do właściwego miejsca. */
export type WorkflowIssueArea = 'STEPS' | 'STEP' | 'TRANSITIONS' | 'REVIEW';

export type WorkflowIssueCode =
  | 'NO_STEPS'
  | 'DUPLICATE_STEP_KEY'
  | 'TRANSITION_UNKNOWN_STEP'
  | 'STEP_UNREACHABLE'
  | 'NO_PATH_TO_END'
  | 'CONDITION_WITHOUT_FORM'
  | 'CONDITION_UNKNOWN_FIELD'
  | 'CONDITION_INVALID'
  | 'FORM_NOT_FOUND'
  | 'FORM_NOT_PUBLISHED'
  | 'ASSIGNEE_MISSING'
  | 'ASSIGNEE_NOT_FOUND'
  | 'ASSIGNEE_INACTIVE'
  | 'REVIEW_MIN_APPROVALS'
  | 'REVIEW_FUNCTION_NOT_FOUND'
  | 'REVIEW_FUNCTION_INACTIVE';

/** Problem z danymi – komunikat po polsku i miejsce, którego dotyczy (etap, reguła przejścia, pole). */
export interface WorkflowProblem {
  message: string;
  field?: string;
  stepKey?: string;
  stepIndex?: number;
  transitionIndex?: number;
  stage?: ReviewStage;
}

/** Problem wykryty przez walidację przed publikacją. */
export interface WorkflowIssue extends WorkflowProblem {
  code: WorkflowIssueCode;
  area: WorkflowIssueArea;
}

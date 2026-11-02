// src/types/automation.types.ts
// Typy API automatyzacji (/api/automation/*): klocki, łańcuchy, uruchomienia i listy wyboru.

export type AutomationOwnerType = 'FORM_TEMPLATE_VERSION';
export type AutomationEventType = 'FORM_SUBMITTED' | 'FORM_APPROVED' | 'FORM_REJECTED';
export type AutomationOnError = 'STOP' | 'CONTINUE';

export type AutomationParamType =
  | 'text'
  | 'longText'
  | 'number'
  | 'boolean'
  | 'select'
  | 'user'
  | 'role'
  | 'functionGroup'
  | 'emailTemplate'
  | 'taskType';

export type AutomationLookupType = 'user' | 'role' | 'functionGroup' | 'taskType';

export interface AutomationParamOption {
  value: string;
  label: string;
}

export interface AutomationParamVisibility {
  param: string;
  equals: string;
}

export interface AutomationParamDefinition {
  key: string;
  label: string;
  type: AutomationParamType;
  required: boolean;
  description?: string;
  options?: AutomationParamOption[];
  showWhen?: AutomationParamVisibility;
}

export interface AutomationActionDefinition {
  key: string;
  label: string;
  description: string;
  category: string;
  params: AutomationParamDefinition[];
  requiredPermission?: { module: string; action: string };
  supportsDryRun?: boolean;
}

export type AutomationParamValue = string | number | boolean;
export type AutomationParams = Record<string, AutomationParamValue>;

export interface AutomationStep {
  action: string;
  params: AutomationParams;
}

export interface AutomationChain {
  id: number;
  ownerType: AutomationOwnerType;
  ownerId: number;
  eventType: AutomationEventType;
  steps: AutomationStep[];
  onError: AutomationOnError;
}

export interface AutomationChainInput {
  steps: AutomationStep[];
  onError: AutomationOnError;
}

export interface AutomationChainTarget {
  ownerType: AutomationOwnerType;
  ownerId: number;
  eventType: AutomationEventType;
}

export type AutomationRunStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL' | 'BLOCKED';
export type AutomationRunStepStatus = 'PENDING' | 'RETRY' | 'SUCCEEDED' | 'SKIPPED' | 'FAILED';

export interface AutomationRunStep {
  id?: number;
  stepIndex: number;
  action: string;
  status: AutomationRunStepStatus;
  message: string | null;
}

export interface AutomationRun {
  id: number;
  chainId: number | null;
  status: AutomationRunStatus;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string | null;
  message: string | null;
  event?: { type?: string } | null;
  steps: AutomationRunStep[];
}

export interface AutomationLookupOption {
  value: string | number;
  label: string;
}

export interface AutomationApiErrorDetail {
  stepIndex?: number;
  message?: string;
}

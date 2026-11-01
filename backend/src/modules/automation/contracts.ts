// src/modules/automation/contracts.ts
// Kontrakty automatyzacji: klocek (AutomationAction), parametry, kontekst i wynik wykonania.

import type { DomainEvent } from '../events/DomainEventBus';

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

export interface AutomationParamOption {
  value: string;
  label: string;
}

export interface AutomationParamDefinition {
  key: string;
  /** Etykieta po polsku. */
  label: string;
  type: AutomationParamType;
  required: boolean;
  options?: AutomationParamOption[];
  /** Podpowiedź dla osoby budującej łańcuch (PL). */
  description?: string;
}

export interface AutomationRequiredPermission {
  module: string;
  action: string;
}

export type AutomationStepStatus = 'OK' | 'SKIPPED' | 'FAILED';

export interface AutomationStepResult {
  status: AutomationStepStatus;
  /** Komunikat po polsku. */
  message: string;
  output: Record<string, unknown>;
}

export interface AutomationContext {
  event: DomainEvent;
  taskId: number | null;
  contractId: number | null;
  instanceId: number | null;
  /** Kto uruchomił zdarzenie (aktor zdarzenia). */
  actorId: number | null;
  /** Autor łańcucha – do dziennika i jako autor tworzonych rekordów. */
  chainAuthorId: number | null;
}

export type AutomationParams = Record<string, unknown>;

export interface AutomationAction {
  key: string;
  label: string;
  description: string;
  category: string;
  params: AutomationParamDefinition[];
  requiredPermission: AutomationRequiredPermission;
  supportsDryRun: true;
  /** Dodatkowa walidacja zależności między parametrami; zwraca komunikaty PL. */
  validate?(params: AutomationParams): string[];
  /** Dynamiczne opcje list wyboru (np. kanały Slack) – uzupełniane w katalogu. */
  loadOptions?(): Promise<Record<string, AutomationParamOption[]>>;
  run(ctx: AutomationContext, params: AutomationParams, options: { dryRun: boolean }): Promise<AutomationStepResult>;
}

export interface AutomationActionDescriptor {
  key: string;
  label: string;
  description: string;
  category: string;
  params: AutomationParamDefinition[];
  requiredPermission: AutomationRequiredPermission;
  supportsDryRun: true;
}

export const AUTOMATION_OWNER_TYPES = ['FORM_TEMPLATE_VERSION'] as const;
export type AutomationOwnerType = typeof AUTOMATION_OWNER_TYPES[number];

export const AUTOMATION_EVENT_TYPES = ['FORM_SUBMITTED', 'FORM_APPROVED', 'FORM_REJECTED'] as const;
export type AutomationEventType = typeof AUTOMATION_EVENT_TYPES[number];

export type AutomationOnError = 'STOP' | 'CONTINUE';

export interface AutomationStepDefinition {
  action: string;
  params: AutomationParams;
}

/** Maksymalna głębokość łańcucha przyczynowego; powyżej run jest BLOCKED. */
export const MAX_CAUSATION_DEPTH = 3;
/** Maksymalna liczba prób jednego kroku. */
export const MAX_STEP_ATTEMPTS = 3;
/** Opóźnienia przed kolejną próbą kroku (1 min, 5 min, 15 min). */
export const STEP_BACKOFF_MS = [60_000, 300_000, 900_000];

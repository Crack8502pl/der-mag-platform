// src/modules/workflow/validation/parseInput.ts
// Sprawdzenie kształtu danych z API (definicja, wersja robocza). Zbiera wszystkie problemy naraz;
// kompletność procesu (osiągalność etapów, formularze, wykonawcy) sprawdza dopiero walidacja przed publikacją.

import {
  MAX_WORKFLOW_STEPS,
  MAX_WORKFLOW_TRANSITIONS,
  REVIEW_STAGES,
  REVIEW_STAGE_LABELS,
  STEP_KEY_PATTERN,
  WORKFLOW_ASSIGNEE_TYPES,
  WORKFLOW_SUBJECT_TYPES,
  type ReviewConfig,
  type WorkflowAssigneeType,
  type WorkflowProblem,
  type WorkflowSubjectType,
} from '../contracts';
import { WorkflowError } from '../errors';

export const MAX_NAME_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 5000;
export const MAX_TASK_TYPES = 100;
export const MAX_DUE_IN_HOURS = 100_000;
export const MAX_MIN_APPROVALS = 100;
export const MAX_CONDITION_LENGTH = 10_000;
export const MAX_JUSTIFICATION_LENGTH = 2000;
const MAX_ID = 2147483647;
const MAX_PRIORITY = 1_000_000;

export type InputProblem = WorkflowProblem;

export interface DefinitionInput {
  name?: string;
  description?: string | null;
  subjectType?: WorkflowSubjectType;
  taskTypeIds?: number[];
  active?: boolean;
}

export interface DraftStepInput {
  id: number | null;
  /** null = klucz zostanie zachowany (istniejący etap) albo wygenerowany z nazwy. */
  key: string | null;
  name: string;
  assigneeType: WorkflowAssigneeType | null;
  assigneeRef: string | null;
  formTemplateId: number | null;
  dueInHours: number | null;
}

export interface DraftTransitionInput {
  fromStepKey: string;
  toStepKey: string;
  condition: Record<string, unknown> | null;
  priority: number;
}

/** Pominięte sekcje pozostają bez zmian. */
export interface DraftInput {
  steps?: DraftStepInput[];
  transitions?: DraftTransitionInput[];
  allowSkipPurposeAudit?: boolean;
  skipJustification?: string;
  reviewConfig?: ReviewConfig;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_ID;

const isBlank = (value: unknown): boolean => value === undefined || value === null || value === '';

function fail(problems: InputProblem[]): never {
  throw new WorkflowError('VALIDATION_FAILED', problems.map(problem => problem.message).join(' '), problems);
}

/** Identyfikator z adresu (np. :id) – dodatnia liczba całkowita. */
export function parseId(value: unknown, label = 'identyfikator'): number {
  const id = typeof value === 'string' && /^\d{1,10}$/.test(value) ? Number(value) : value;
  if (!isId(id)) throw new WorkflowError('VALIDATION_FAILED', `Nieprawidłowy ${label}.`);
  return id;
}

export function parseDefinitionInput(body: unknown, mode: 'create' | 'update'): DefinitionInput {
  if (!isObject(body)) throw new WorkflowError('VALIDATION_FAILED', 'Nieprawidłowe dane procesu.');
  const problems: InputProblem[] = [];
  const result: DefinitionInput = {};

  if (body.name !== undefined || mode === 'create') {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) problems.push({ field: 'name', message: 'Podaj nazwę procesu.' });
    else if (name.length > MAX_NAME_LENGTH) problems.push({ field: 'name', message: `Nazwa procesu może mieć najwyżej ${MAX_NAME_LENGTH} znaków.` });
    else result.name = name;
  }

  if (body.description !== undefined) {
    if (body.description === null || typeof body.description === 'string') {
      const description = body.description?.trim() || null;
      if (description && description.length > MAX_DESCRIPTION_LENGTH) {
        problems.push({ field: 'description', message: `Opis procesu może mieć najwyżej ${MAX_DESCRIPTION_LENGTH} znaków.` });
      } else {
        result.description = description;
      }
    } else {
      problems.push({ field: 'description', message: 'Opis procesu musi być tekstem.' });
    }
  } else if (mode === 'create') {
    result.description = null;
  }

  if (body.subjectType !== undefined || mode === 'create') {
    if (WORKFLOW_SUBJECT_TYPES.includes(body.subjectType as WorkflowSubjectType)) result.subjectType = body.subjectType as WorkflowSubjectType;
    else problems.push({ field: 'subjectType', message: 'Wybierz, czego dotyczy proces: zadania, kontraktu albo urządzenia.' });
  }

  if (body.taskTypeIds !== undefined && body.taskTypeIds !== null) {
    if (!Array.isArray(body.taskTypeIds) || body.taskTypeIds.length > MAX_TASK_TYPES || !body.taskTypeIds.every(isId)) {
      problems.push({ field: 'taskTypeIds', message: 'Nieprawidłowa lista typów zadań.' });
    } else {
      result.taskTypeIds = [...new Set(body.taskTypeIds as number[])].sort((a, b) => a - b);
    }
  } else if (mode === 'create' || body.taskTypeIds === null) {
    result.taskTypeIds = [];
  }

  if (body.active !== undefined) {
    if (typeof body.active === 'boolean') result.active = body.active;
    else problems.push({ field: 'active', message: 'Pole „Aktywny” musi mieć wartość tak albo nie.' });
  } else if (mode === 'create') {
    result.active = true;
  }

  if (problems.length) fail(problems);
  return result;
}

function parseStep(raw: unknown, stepIndex: number, problems: InputProblem[]): DraftStepInput | null {
  const number = `Etap nr ${stepIndex + 1}`;
  if (!isObject(raw)) {
    problems.push({ stepIndex, message: `${number}: nieprawidłowe dane etapu.` });
    return null;
  }
  const before = problems.length;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) problems.push({ stepIndex, field: 'name', message: `${number}: podaj nazwę etapu.` });
  else if (name.length > MAX_NAME_LENGTH) problems.push({ stepIndex, field: 'name', message: `${number}: nazwa etapu może mieć najwyżej ${MAX_NAME_LENGTH} znaków.` });
  const label = name && name.length <= MAX_NAME_LENGTH ? `Etap „${name}”` : number;

  if (!isBlank(raw.id) && !isId(raw.id)) problems.push({ stepIndex, field: 'id', message: `${label}: nieprawidłowy identyfikator etapu.` });

  const key = isBlank(raw.key) ? null : raw.key;
  if (key !== null && (typeof key !== 'string' || !STEP_KEY_PATTERN.test(key))) {
    problems.push({ stepIndex, field: 'key', message: `${label}: identyfikator etapu może zawierać tylko litery, cyfry, „_” i „-” (do 100 znaków).` });
  }

  const assigneeType = isBlank(raw.assigneeType) ? null : raw.assigneeType;
  if (assigneeType !== null && !WORKFLOW_ASSIGNEE_TYPES.includes(assigneeType as WorkflowAssigneeType)) {
    problems.push({ stepIndex, field: 'assigneeType', message: `${label}: nieznany rodzaj wykonawcy.` });
  }
  let assigneeRef: string | null = null;
  if (typeof raw.assigneeRef === 'number' && isId(raw.assigneeRef)) {
    assigneeRef = String(raw.assigneeRef);
  } else if (typeof raw.assigneeRef === 'string' && raw.assigneeRef.trim().length <= 100) {
    assigneeRef = raw.assigneeRef.trim() || null;
  } else if (!isBlank(raw.assigneeRef)) {
    problems.push({ stepIndex, field: 'assignee', message: `${label}: nieprawidłowy wykonawca.` });
  }

  const formTemplateId = isBlank(raw.formTemplateId) ? null : raw.formTemplateId;
  if (formTemplateId !== null && !isId(formTemplateId)) {
    problems.push({ stepIndex, field: 'formTemplateId', message: `${label}: nieprawidłowy formularz.` });
  }

  const dueInHours = isBlank(raw.dueInHours) ? null : raw.dueInHours;
  if (dueInHours !== null && (typeof dueInHours !== 'number' || !Number.isInteger(dueInHours) || dueInHours < 1 || dueInHours > MAX_DUE_IN_HOURS)) {
    problems.push({ stepIndex, field: 'dueInHours', message: `${label}: termin musi być liczbą całkowitą godzin od 1 do ${MAX_DUE_IN_HOURS}.` });
  }

  if (problems.length > before) return null;
  const type = assigneeType as WorkflowAssigneeType | null;
  return {
    id: isBlank(raw.id) ? null : raw.id as number,
    key: key as string | null,
    name,
    assigneeType: type,
    assigneeRef: type === null || type === 'SUBJECT_ASSIGNEE' ? null : assigneeRef,
    formTemplateId: formTemplateId as number | null,
    dueInHours: dueInHours as number | null,
  };
}

function parseTransition(raw: unknown, transitionIndex: number, problems: InputProblem[]): DraftTransitionInput | null {
  const number = `Reguła przejścia nr ${transitionIndex + 1}`;
  if (!isObject(raw)) {
    problems.push({ transitionIndex, message: `${number}: nieprawidłowe dane reguły.` });
    return null;
  }
  const before = problems.length;
  const stepKey = (value: unknown) => (typeof value === 'string' && value.length > 0 && value.length <= 100 ? value : null);
  const fromStepKey = stepKey(raw.fromStepKey);
  const toStepKey = stepKey(raw.toStepKey);
  if (fromStepKey === null) problems.push({ transitionIndex, field: 'fromStepKey', message: `${number}: wybierz etap, z którego prowadzi reguła.` });
  if (toStepKey === null) problems.push({ transitionIndex, field: 'toStepKey', message: `${number}: wybierz etap docelowy.` });

  let condition: Record<string, unknown> | null = null;
  if (isObject(raw.condition)) {
    if (JSON.stringify(raw.condition).length > MAX_CONDITION_LENGTH) {
      problems.push({ transitionIndex, field: 'condition', message: `${number}: warunek jest zbyt rozbudowany.` });
    } else {
      condition = raw.condition;
    }
  } else if (raw.condition !== undefined && raw.condition !== null) {
    problems.push({ transitionIndex, field: 'condition', message: `${number}: nieprawidłowy warunek.` });
  }

  const priority = raw.priority === undefined || raw.priority === null ? transitionIndex + 1 : raw.priority;
  if (typeof priority !== 'number' || !Number.isInteger(priority) || Math.abs(priority) > MAX_PRIORITY) {
    problems.push({ transitionIndex, field: 'priority', message: `${number}: nieprawidłowa kolejność sprawdzania.` });
  }

  if (problems.length > before) return null;
  return { fromStepKey: fromStepKey!, toStepKey: toStepKey!, condition, priority: priority as number };
}

/** Ustawienia zatwierdzania: obie części (audyt celowości, przegląd techniczny), minApprovals ≥ 1. */
export function parseReviewConfig(raw: unknown, problems: InputProblem[]): ReviewConfig | null {
  if (!isObject(raw)) {
    problems.push({ field: 'reviewConfig', message: 'Nieprawidłowe ustawienia zatwierdzania.' });
    return null;
  }
  const before = problems.length;
  const config: Partial<ReviewConfig> = {};
  for (const stage of REVIEW_STAGES) {
    const label = REVIEW_STAGE_LABELS[stage];
    const value = isObject(raw[stage]) ? raw[stage] as Record<string, unknown> : {};
    const functionKey = typeof value.functionKey === 'string' ? value.functionKey.trim() : '';
    if (!functionKey || functionKey.length > 100) {
      problems.push({ stage, field: 'functionKey', message: `${label}: wybierz funkcję zatwierdzającą.` });
    }
    const minApprovals = value.minApprovals;
    if (typeof minApprovals !== 'number' || !Number.isInteger(minApprovals) || minApprovals < 1) {
      problems.push({ stage, field: 'minApprovals', message: `${label}: minimalna liczba akceptacji musi wynosić co najmniej 1.` });
    } else if (minApprovals > MAX_MIN_APPROVALS) {
      problems.push({ stage, field: 'minApprovals', message: `${label}: minimalna liczba akceptacji może wynosić najwyżej ${MAX_MIN_APPROVALS}.` });
    }
    config[stage] = { functionKey, minApprovals: minApprovals as number };
  }
  return problems.length > before ? null : config as ReviewConfig;
}

export function parseDraftInput(body: unknown): DraftInput {
  if (!isObject(body)) throw new WorkflowError('VALIDATION_FAILED', 'Nieprawidłowe dane wersji procesu.');
  const problems: InputProblem[] = [];
  const result: DraftInput = {};

  if (body.steps !== undefined) {
    if (!Array.isArray(body.steps)) {
      problems.push({ field: 'steps', message: 'Etapy procesu muszą być listą.' });
    } else if (body.steps.length > MAX_WORKFLOW_STEPS) {
      problems.push({ field: 'steps', message: `Proces może mieć najwyżej ${MAX_WORKFLOW_STEPS} etapów.` });
    } else {
      const steps = body.steps.map((raw, index) => parseStep(raw, index, problems));
      const seenIds = new Set<number>();
      steps.forEach((step, stepIndex) => {
        if (!step?.id) return;
        if (seenIds.has(step.id)) problems.push({ stepIndex, field: 'id', message: `Etap „${step.name}” występuje na liście więcej niż raz.` });
        seenIds.add(step.id);
      });
      result.steps = steps.filter((step): step is DraftStepInput => step !== null);
    }
  }

  if (body.transitions !== undefined) {
    if (!Array.isArray(body.transitions)) {
      problems.push({ field: 'transitions', message: 'Reguły przejść muszą być listą.' });
    } else if (body.transitions.length > MAX_WORKFLOW_TRANSITIONS) {
      problems.push({ field: 'transitions', message: `Proces może mieć najwyżej ${MAX_WORKFLOW_TRANSITIONS} reguł przejść.` });
    } else {
      result.transitions = body.transitions
        .map((raw, index) => parseTransition(raw, index, problems))
        .filter((transition): transition is DraftTransitionInput => transition !== null);
    }
  }

  if (body.allowSkipPurposeAudit !== undefined) {
    if (typeof body.allowSkipPurposeAudit === 'boolean') result.allowSkipPurposeAudit = body.allowSkipPurposeAudit;
    else problems.push({ field: 'allowSkipPurposeAudit', message: 'Ustawienie „Pozwól pominąć audyt celowości” musi mieć wartość tak albo nie.' });
  }

  if (body.skipJustification !== undefined && body.skipJustification !== null) {
    if (typeof body.skipJustification === 'string' && body.skipJustification.length <= MAX_JUSTIFICATION_LENGTH) {
      result.skipJustification = body.skipJustification.trim();
    } else {
      problems.push({ field: 'skipJustification', message: `Uzasadnienie musi być tekstem o długości najwyżej ${MAX_JUSTIFICATION_LENGTH} znaków.` });
    }
  }

  if (body.reviewConfig !== undefined) {
    const reviewConfig = parseReviewConfig(body.reviewConfig, problems);
    if (reviewConfig) result.reviewConfig = reviewConfig;
  }

  if (problems.length) fail(problems);
  return result;
}

// src/components/automation/automationHelpers.ts
// Logika pola „Automatyzacje”: dopasowanie klocków, widoczność i wymagalność ustawień, podsumowania, błędy API.

import type {
  AutomationActionDefinition,
  AutomationApiErrorDetail,
  AutomationLookupType,
  AutomationOnError,
  AutomationParamDefinition,
  AutomationParams,
  AutomationParamValue,
  AutomationRunStatus,
  AutomationRunStepStatus,
  AutomationStep,
} from '../../types/automation.types';

export interface EditableStep {
  id: string;
  action: string;
  params: AutomationParams;
}

export interface ActionGroup {
  category: string;
  actions: AutomationActionDefinition[];
}

export interface DataSourceOption {
  expression: string;
  label: string;
  group: string;
}

export const MAX_STEPS = 20;
export const MAX_TEXT_LENGTH = 500;
export const MAX_LONG_TEXT_LENGTH = 10_000;

export const LOOKUP_PARAM_TYPES: ReadonlyArray<AutomationLookupType> = ['user', 'role', 'functionGroup', 'taskType'];

export const isLookupType = (type: string): type is AutomationLookupType =>
  (LOOKUP_PARAM_TYPES as ReadonlyArray<string>).includes(type);

export const STEP_STATUS_LABELS: Record<AutomationRunStepStatus, string> = {
  PENDING: 'Oczekuje',
  RETRY: 'Ponowienie',
  SUCCEEDED: 'OK',
  SKIPPED: 'Pominięto',
  FAILED: 'Błąd',
};

export const RUN_STATUS_LABELS: Record<AutomationRunStatus, string> = {
  RUNNING: 'W toku',
  SUCCEEDED: 'Zakończone powodzeniem',
  FAILED: 'Zakończone błędem',
  PARTIAL: 'Wykonane częściowo',
  BLOCKED: 'Zablokowane',
};

export const EVENT_LABELS: Record<string, string> = {
  FORM_SUBMITTED: 'Po wysłaniu',
  FORM_APPROVED: 'Po zatwierdzeniu',
  FORM_REJECTED: 'Po odrzuceniu',
};

let stepCounter = 0;
export const createStepId = (): string => {
  stepCounter += 1;
  return `step-${stepCounter}`;
};

export const toEditableSteps = (steps: AutomationStep[]): EditableStep[] =>
  steps.map(step => ({ id: createStepId(), action: step.action, params: { ...step.params } }));

/** Tekst bez polskich znaków, wielkości liter i myślników – do wyszukiwania („mail” znajduje „e-mail”). */
export const normalizeText = (value: string): string => value
  .toLowerCase()
  .replace(/ł/g, 'l')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[-‐‑–]/g, '')
  .trim();

/** Klocki pasujące do wpisanego fragmentu (nazwa, opis, kategoria); trafienia w nazwie są pierwsze. */
export function matchActions(actions: AutomationActionDefinition[], query: string): AutomationActionDefinition[] {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const scored: Array<{ action: AutomationActionDefinition; score: number; index: number }> = [];
  actions.forEach((action, index) => {
    const label = normalizeText(action.label);
    const rest = normalizeText(`${action.description} ${action.category}`);
    if (tokens.every(token => label.includes(token))) scored.push({ action, score: 0, index });
    else if (tokens.every(token => label.includes(token) || rest.includes(token))) scored.push({ action, score: 1, index });
  });
  return scored.sort((a, b) => a.score - b.score || a.index - b.index).map(item => item.action);
}

export function groupActionsByCategory(actions: AutomationActionDefinition[]): ActionGroup[] {
  const groups: ActionGroup[] = [];
  for (const action of actions) {
    const category = action.category || 'Inne';
    const group = groups.find(item => item.category === category);
    if (group) group.actions.push(action);
    else groups.push({ category, actions: [action] });
  }
  return groups;
}

export interface SystemVariable {
  expression: string;
  description: string;
  label?: string;
  group?: string;
  usableInForms?: boolean;
}

/** Dane z systemu, które można wstawić do tekstu kroku (te same co w formularzach). */
export const toDataSources = (variables: SystemVariable[]): DataSourceOption[] =>
  variables
    .filter(variable => variable.usableInForms)
    .map(variable => ({
      expression: variable.expression,
      label: variable.label || variable.description || variable.expression,
      group: variable.group || 'Inne',
    }));

export interface DataSourceGroup {
  group: string;
  items: DataSourceOption[];
}

export function groupDataSources(sources: DataSourceOption[]): DataSourceGroup[] {
  const groups: DataSourceGroup[] = [];
  for (const source of sources) {
    const name = source.group || 'Inne';
    const group = groups.find(item => item.group === name);
    if (group) group.items.push(source);
    else groups.push({ group: name, items: [source] });
  }
  return groups;
}

export const isEmptyParamValue = (value: unknown): boolean =>
  value === undefined
  || value === null
  || (typeof value === 'string' && value.trim() === '')
  || (typeof value === 'number' && !Number.isFinite(value));

export const isParamVisible = (param: AutomationParamDefinition, params: AutomationParams): boolean =>
  !param.showWhen || String(params[param.showWhen.param] ?? '') === String(param.showWhen.equals);

/** Pole zależne od innego pola jest wymagane zawsze, gdy jest widoczne. */
export const isParamRequired = (param: AutomationParamDefinition): boolean => param.required || !!param.showWhen;

export const visibleParams = (action: AutomationActionDefinition, params: AutomationParams): AutomationParamDefinition[] =>
  action.params.filter(param => isParamVisible(param, params));

/** Nazwy wymaganych ustawień, których brakuje w kroku. */
export function missingParamLabels(action: AutomationActionDefinition, params: AutomationParams): string[] {
  return visibleParams(action, params)
    .filter(param => isParamRequired(param) && param.type !== 'boolean' && isEmptyParamValue(params[param.key]))
    .map(param => param.label);
}

/** Ustawienia w postaci wysyłanej do API: bez ukrytych i pustych pól. */
export function buildSavedParams(action: AutomationActionDefinition, params: AutomationParams): AutomationParams {
  const saved: AutomationParams = {};
  for (const param of visibleParams(action, params)) {
    const value = params[param.key];
    if (isEmptyParamValue(value)) {
      if (param.type === 'boolean' && isParamRequired(param)) saved[param.key] = false;
      continue;
    }
    saved[param.key] = value as AutomationParamValue;
  }
  return saved;
}

export function toChainSteps(steps: EditableStep[], actions: Map<string, AutomationActionDefinition>): AutomationStep[] {
  return steps.map(step => {
    const action = actions.get(step.action);
    return { action: step.action, params: action ? buildSavedParams(action, step.params) : step.params };
  });
}

/** Odcisk łańcucha do wykrywania niezapisanych zmian. */
export const chainSignature = (
  steps: Array<{ action: string; params: AutomationParams }>,
  onError: AutomationOnError,
  actions: Map<string, AutomationActionDefinition>,
): string => JSON.stringify({
  onError,
  steps: steps.map(step => {
    const action = actions.get(step.action);
    const params = action ? buildSavedParams(action, step.params) : step.params;
    return [step.action, Object.keys(params).sort().map(key => [key, params[key]])];
  }),
});

export const lookupKey = (type: string, value: string | number): string => `${type}:${value}`;

const VARIABLE_PATTERN = /\{([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+)\}/g;

/** Zamienia {task.number} na czytelną nazwę, np. [Numer zadania]; nieznane zmienne zostają bez zmian. */
export const humanizeVariables = (text: string, sources: DataSourceOption[]): string =>
  text.replace(VARIABLE_PATTERN, (match, expression: string) => {
    const source = sources.find(item => item.expression === expression);
    return source ? `[${source.label}]` : match;
  });

const truncate = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export interface SummaryContext {
  lookupLabels: Record<string, string>;
  sources: DataSourceOption[];
}

function displayParamValue(param: AutomationParamDefinition, value: AutomationParamValue, context: SummaryContext): string {
  if (param.type === 'boolean') return value === true ? 'tak' : 'nie';
  if (param.type === 'select' || param.type === 'emailTemplate') {
    return param.options?.find(option => option.value === String(value))?.label ?? String(value);
  }
  if (isLookupType(param.type)) return context.lookupLabels[lookupKey(param.type, String(value))] ?? '…';
  return truncate(humanizeVariables(String(value), context.sources), 80);
}

/** Krótki opis ustawień kroku widoczny na kafelku (bez długich treści). */
export function summarizeParams(action: AutomationActionDefinition, params: AutomationParams, context: SummaryContext): string {
  return visibleParams(action, params)
    .filter(param => param.type !== 'longText' && !isEmptyParamValue(params[param.key]))
    .map(param => `${param.label}: ${displayParamValue(param, params[param.key], context)}`)
    .join(' · ');
}

export interface AutomationApiError {
  message: string;
  steps: Array<{ stepIndex: number; message: string }>;
}

const STEP_PREFIX = /^Krok \d+(?: \([^)]*\))?:\s*/;

const capitalize = (text: string): string => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

/** Komunikat dla jednego kafelka: bez przedrostka „Krok N (Nazwa):”. */
export const stripStepPrefix = (message: string): string => capitalize(message.replace(STEP_PREFIX, '').trim());

/** Błąd odpowiedzi API po polsku, z podziałem na kroki, których dotyczy. */
export function readAutomationError(error: unknown, fallback: string): AutomationApiError {
  const data = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { data?: { message?: unknown; details?: unknown } } }).response?.data
    : undefined;
  const message = typeof data?.message === 'string' && data.message.trim() ? data.message : '';
  const rawDetails = data?.details;
  const details = (Array.isArray(rawDetails) ? rawDetails : rawDetails ? [rawDetails] : []) as AutomationApiErrorDetail[];
  const steps = details
    .filter(detail => typeof detail === 'object' && detail !== null && Number.isInteger(detail.stepIndex))
    .map(detail => ({
      stepIndex: detail.stepIndex as number,
      message: stripStepPrefix(typeof detail.message === 'string' && detail.message ? detail.message : message) || fallback,
    }));
  return { message: steps.length ? '' : (message || fallback), steps };
}

export function formatRunDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
}

export const moveStep = <T,>(items: T[], from: number, to: number): T[] => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
};

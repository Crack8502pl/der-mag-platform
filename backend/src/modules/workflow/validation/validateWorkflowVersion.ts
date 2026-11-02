// src/modules/workflow/validation/validateWorkflowVersion.ts
// Walidacja wersji procesu przed publikacją. Zwraca WSZYSTKIE problemy naraz, z komunikatami po polsku.
// Funkcja jest czysta – dane z bazy (formularze, role, funkcje, brygady, osoby) dostaje w `lookups`.

import { validateFormConditionShape } from '../../../services/FormRules';
import {
  REVIEW_STAGES,
  REVIEW_STAGE_LABELS,
  type WorkflowIssue,
} from '../contracts';

export interface ValidationStep {
  key: string;
  name: string;
  assigneeType: string | null;
  assigneeRef: string | null;
  formTemplateId: number | null;
}

export interface ValidationTransition {
  fromStepKey: string;
  toStepKey: string;
  condition: unknown;
  priority: number;
}

export interface ValidationForm {
  name: string;
  /** Klucze pól ostatniej opublikowanej wersji formularza; null = brak opublikowanej wersji. */
  publishedFieldKeys: Set<string> | null;
}

export interface ValidationNamedRecord {
  name: string;
  active: boolean;
}

export interface WorkflowValidationLookups {
  forms: Map<number, ValidationForm>;
  roles: Map<number, { name: string }>;
  functionGroups: Map<string, ValidationNamedRecord>;
  brigades: Map<number, ValidationNamedRecord>;
  users: Map<number, ValidationNamedRecord>;
}

export interface WorkflowValidationInput {
  /** Etapy w kolejności (sort_order). */
  steps: ValidationStep[];
  transitions: ValidationTransition[];
  reviewConfig: unknown;
  lookups: WorkflowValidationLookups;
}

const END = Symbol('END');
const MAX_CONDITION_WALK_DEPTH = 10;
const FORM_REFERENCE = /^\$\{\s*form\.([A-Za-z0-9_-]+)\s*\}$/;

const quote = (text: string): string => `„${text}”`;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Dodatni identyfikator zapisany tekstem (np. assignee_ref) albo null. */
export function parseRefId(value: string | null): number | null {
  if (value === null || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return id <= 2147483647 ? id : null;
}

/** Klucze pól, do których odnosi się warunek (pole `field` i odwołania `${form.klucz}` w wartości). */
export function conditionFieldKeys(condition: unknown, keys = new Set<string>(), depth = 0): Set<string> {
  if (!isObject(condition) || depth > MAX_CONDITION_WALK_DEPTH) return keys;
  for (const group of ['all', 'any']) {
    const items = condition[group];
    if (Array.isArray(items)) items.forEach(item => conditionFieldKeys(item, keys, depth + 1));
  }
  if ('not' in condition) conditionFieldKeys(condition.not, keys, depth + 1);
  if (typeof condition.field === 'string') keys.add(condition.field);
  if (typeof condition.value === 'string') {
    const reference = FORM_REFERENCE.exec(condition.value);
    if (reference) keys.add(reference[1]);
  }
  return keys;
}

const ASSIGNEE_LABELS: Record<string, { missing: string; notFound: string; inactive: (name: string) => string }> = {
  ROLE: {
    missing: 'wybierz rolę, która wykonuje etap',
    notFound: 'wybrana rola nie istnieje',
    inactive: name => `rola ${quote(name)} jest nieaktywna`,
  },
  FUNCTION_GROUP: {
    missing: 'wybierz funkcję, która wykonuje etap',
    notFound: 'wybrana funkcja nie istnieje',
    inactive: name => `funkcja ${quote(name)} jest nieaktywna`,
  },
  BRIGADE: {
    missing: 'wybierz brygadę, która wykonuje etap',
    notFound: 'wybrana brygada nie istnieje',
    inactive: name => `brygada ${quote(name)} jest nieaktywna`,
  },
  USER: {
    missing: 'wybierz osobę, która wykonuje etap',
    notFound: 'wybrana osoba nie istnieje',
    inactive: name => `osoba ${quote(name)} ma nieaktywne konto`,
  },
};

function assigneeIssue(step: ValidationStep, stepIndex: number, lookups: WorkflowValidationLookups): WorkflowIssue | null {
  const base = { area: 'STEP' as const, stepKey: step.key, stepIndex, field: 'assignee' };
  const prefix = `Etap ${quote(step.name)}: `;
  if (!step.assigneeType) {
    return { ...base, code: 'ASSIGNEE_MISSING', message: `${prefix}wybierz, kto wykonuje etap.` };
  }
  if (step.assigneeType === 'SUBJECT_ASSIGNEE') return null;
  const labels = ASSIGNEE_LABELS[step.assigneeType];
  if (!labels) return { ...base, code: 'ASSIGNEE_NOT_FOUND', message: `${prefix}nieznany rodzaj wykonawcy.` };
  const ref = step.assigneeRef?.trim() || null;
  if (!ref) return { ...base, code: 'ASSIGNEE_MISSING', message: `${prefix}${labels.missing}.` };

  let record: { name: string; active?: boolean } | undefined;
  if (step.assigneeType === 'FUNCTION_GROUP') {
    record = lookups.functionGroups.get(ref);
  } else {
    const id = parseRefId(ref);
    const map = step.assigneeType === 'ROLE' ? lookups.roles : step.assigneeType === 'BRIGADE' ? lookups.brigades : lookups.users;
    record = id === null ? undefined : map.get(id);
  }
  if (!record) return { ...base, code: 'ASSIGNEE_NOT_FOUND', message: `${prefix}${labels.notFound}.` };
  if (record.active === false) {
    return { ...base, code: 'ASSIGNEE_INACTIVE', message: `${prefix}${labels.inactive(record.name)}.` };
  }
  return null;
}

function formIssue(step: ValidationStep, stepIndex: number, lookups: WorkflowValidationLookups): WorkflowIssue | null {
  if (step.formTemplateId === null) return null;
  const base = { area: 'STEP' as const, stepKey: step.key, stepIndex, field: 'formTemplateId' };
  const form = lookups.forms.get(step.formTemplateId);
  if (!form) {
    return { ...base, code: 'FORM_NOT_FOUND', message: `Etap ${quote(step.name)}: wybrany formularz nie istnieje.` };
  }
  if (!form.publishedFieldKeys) {
    return {
      ...base,
      code: 'FORM_NOT_PUBLISHED',
      message: `Etap ${quote(step.name)}: formularz ${quote(form.name)} nie ma opublikowanej wersji – opublikuj go w edytorze formularzy.`,
    };
  }
  return null;
}

function reviewIssues(reviewConfig: unknown, lookups: WorkflowValidationLookups): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  for (const stage of REVIEW_STAGES) {
    const label = REVIEW_STAGE_LABELS[stage];
    const config = isObject(reviewConfig) && isObject(reviewConfig[stage]) ? reviewConfig[stage] as Record<string, unknown> : {};
    const minApprovals = config.minApprovals;
    if (typeof minApprovals !== 'number' || !Number.isInteger(minApprovals) || minApprovals < 1) {
      issues.push({
        code: 'REVIEW_MIN_APPROVALS',
        area: 'REVIEW',
        stage,
        field: 'minApprovals',
        message: `${label}: minimalna liczba akceptacji musi wynosić co najmniej 1.`,
      });
    }
    const functionKey = typeof config.functionKey === 'string' ? config.functionKey.trim() : '';
    const group = functionKey ? lookups.functionGroups.get(functionKey) : undefined;
    if (!functionKey) {
      issues.push({ code: 'REVIEW_FUNCTION_NOT_FOUND', area: 'REVIEW', stage, field: 'functionKey', message: `${label}: wybierz funkcję zatwierdzającą.` });
    } else if (!group) {
      issues.push({
        code: 'REVIEW_FUNCTION_NOT_FOUND',
        area: 'REVIEW',
        stage,
        field: 'functionKey',
        message: `${label}: funkcja ${quote(functionKey)} nie istnieje.`,
      });
    } else if (!group.active) {
      issues.push({
        code: 'REVIEW_FUNCTION_INACTIVE',
        area: 'REVIEW',
        stage,
        field: 'functionKey',
        message: `${label}: funkcja ${quote(group.name)} jest nieaktywna.`,
      });
    }
  }
  return issues;
}

export function validateWorkflowVersion(input: WorkflowValidationInput): WorkflowIssue[] {
  const { steps, transitions, reviewConfig, lookups } = input;
  const issues: WorkflowIssue[] = [];

  // Co najmniej jeden etap.
  if (steps.length === 0) {
    issues.push({ code: 'NO_STEPS', area: 'STEPS', message: 'Proces musi mieć co najmniej jeden etap.' });
  }

  // Unikalne klucze etapów.
  const indexesByKey = new Map<string, number[]>();
  steps.forEach((step, index) => indexesByKey.set(step.key, [...(indexesByKey.get(step.key) ?? []), index]));
  for (const [key, indexes] of indexesByKey) {
    if (indexes.length < 2) continue;
    issues.push({
      code: 'DUPLICATE_STEP_KEY',
      area: 'STEPS',
      stepKey: key,
      stepIndex: indexes[1],
      message: `Etapy ${indexes.map(index => quote(steps[index].name)).join(', ')} mają ten sam identyfikator ${quote(key)} – każdy etap musi mieć własny.`,
    });
  }
  const firstIndexByKey = new Map([...indexesByKey].map(([key, indexes]) => [key, indexes[0]]));
  const stepName = (key: string): string => {
    const index = firstIndexByKey.get(key);
    return index === undefined ? key : steps[index].name;
  };

  // Formularze i wykonawcy etapów.
  steps.forEach((step, index) => {
    const form = formIssue(step, index, lookups);
    if (form) issues.push(form);
    const assignee = assigneeIssue(step, index, lookups);
    if (assignee) issues.push(assignee);
  });

  // Przejścia wskazują istniejące etapy; warunki dotyczą pól formularza etapu źródłowego.
  transitions.forEach((transition, transitionIndex) => {
    const base = { area: 'TRANSITIONS' as const, transitionIndex };
    const fromIndex = firstIndexByKey.get(transition.fromStepKey);
    if (fromIndex === undefined) {
      issues.push({
        ...base,
        code: 'TRANSITION_UNKNOWN_STEP',
        field: 'fromStepKey',
        message: `Reguła przejścia nr ${transitionIndex + 1} zaczyna się w etapie ${quote(transition.fromStepKey)}, którego nie ma w procesie.`,
      });
    }
    if (!firstIndexByKey.has(transition.toStepKey)) {
      issues.push({
        ...base,
        code: 'TRANSITION_UNKNOWN_STEP',
        field: 'toStepKey',
        message: `Reguła przejścia nr ${transitionIndex + 1} prowadzi do etapu ${quote(transition.toStepKey)}, którego nie ma w procesie.`,
      });
    }
    if (transition.condition === null || transition.condition === undefined || fromIndex === undefined) return;

    const source = steps[fromIndex];
    const rule = `Warunek reguły przejścia z ${quote(source.name)} do ${quote(stepName(transition.toStepKey))}`;
    if (source.formTemplateId === null) {
      issues.push({
        ...base,
        code: 'CONDITION_WITHOUT_FORM',
        field: 'condition',
        stepKey: source.key,
        message: `${rule} wymaga formularza w etapie ${quote(source.name)} – warunek może dotyczyć tylko pól formularza etapu, z którego wychodzi reguła.`,
      });
      return;
    }
    const referenced = conditionFieldKeys(transition.condition);
    const form = lookups.forms.get(source.formTemplateId);
    if (form?.publishedFieldKeys) {
      for (const key of referenced) {
        if (form.publishedFieldKeys.has(key)) continue;
        issues.push({
          ...base,
          code: 'CONDITION_UNKNOWN_FIELD',
          field: 'condition',
          stepKey: source.key,
          message: `${rule} odnosi się do pola ${quote(key)}, którego nie ma w formularzu ${quote(form.name)} etapu ${quote(source.name)}.`,
        });
      }
    }
    try {
      const known = new Set([...(form?.publishedFieldKeys ?? []), ...referenced]);
      validateFormConditionShape({ when: transition.condition }, known, 'workflow transition', ['when']);
    } catch {
      issues.push({
        ...base,
        code: 'CONDITION_INVALID',
        field: 'condition',
        stepKey: source.key,
        message: `${rule} jest niepoprawny – ustaw go ponownie w edytorze warunków.`,
      });
    }
  });

  // Osiągalność etapów i droga do końca. Krawędzie: reguły według priorytetu (bezwarunkowa kończy listę),
  // a jeśli żadna reguła nie jest bezwarunkowa – następny etap według kolejności albo koniec procesu.
  const nodes = steps.filter((step, index) => firstIndexByKey.get(step.key) === index).map(step => step.key);
  if (nodes.length > 0) {
    const edges = new Map<string, Array<string | typeof END>>();
    nodes.forEach((key, position) => {
      const targets: Array<string | typeof END> = [];
      const outgoing = transitions
        .map((transition, index) => ({ transition, index }))
        .filter(({ transition }) => transition.fromStepKey === key && firstIndexByKey.has(transition.toStepKey))
        .sort((a, b) => a.transition.priority - b.transition.priority || a.index - b.index);
      let unconditional = false;
      for (const { transition } of outgoing) {
        targets.push(transition.toStepKey);
        if (transition.condition === null || transition.condition === undefined) {
          unconditional = true;
          break;
        }
      }
      if (!unconditional) targets.push(position + 1 < nodes.length ? nodes[position + 1] : END);
      edges.set(key, targets);
    });

    const reachable = new Set<string>([nodes[0]]);
    const queue = [nodes[0]];
    while (queue.length) {
      for (const target of edges.get(queue.shift()!) ?? []) {
        if (target !== END && !reachable.has(target)) {
          reachable.add(target);
          queue.push(target);
        }
      }
    }
    const reachesEnd = new Set<string>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const key of nodes) {
        if (reachesEnd.has(key)) continue;
        if ((edges.get(key) ?? []).some(target => target === END || reachesEnd.has(target))) {
          reachesEnd.add(key);
          changed = true;
        }
      }
    }
    nodes.forEach(key => {
      const stepIndex = firstIndexByKey.get(key)!;
      if (!reachable.has(key)) {
        issues.push({
          code: 'STEP_UNREACHABLE',
          area: 'TRANSITIONS',
          stepKey: key,
          stepIndex,
          message: `Etap ${quote(steps[stepIndex].name)} jest nieosiągalny – nie prowadzi do niego żadna droga od pierwszego etapu ${quote(steps[0].name)}.`,
        });
      }
      if (!reachesEnd.has(key)) {
        issues.push({
          code: 'NO_PATH_TO_END',
          area: 'TRANSITIONS',
          stepKey: key,
          stepIndex,
          message: `Z etapu ${quote(steps[stepIndex].name)} nie da się dojść do końca procesu – reguły przejść tworzą pętlę bez wyjścia.`,
        });
      }
    });
  }

  issues.push(...reviewIssues(reviewConfig, lookups));
  return issues;
}

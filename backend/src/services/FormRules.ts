import { FormDomainError } from '../errors/FormDomainError';
import { FormFieldDefinition } from '../entities/FormFieldDefinition';
import { FormSection } from '../entities/FormSection';
import { FormJsonValue } from '../entities/FormTypes';
import { FormResponses } from '../dto/FormServiceDto';
import { RESERVED_FORM_KEYS } from '../utils/formJson';
import { VariableParser } from '../modules/variable-engine/parser/VariableParser';
import { getFormDataSource } from '../modules/variable-engine/formDataSources';

const MAX_CONDITION_DEPTH = 3;
const MAX_CONDITION_GROUP = 20;
const FORM_REFERENCE_PREFIX = 'form.';
const variableParser = new VariableParser();

/**
 * A condition operand of the form `${form.<fieldKey>}` is parsed with the shared
 * Variable Engine parser and resolved against the stored form responses.
 * Returns the referenced field key, or null when the value is a plain literal.
 * Throws for any other `${...}` usage (no foreign namespaces, no expressions).
 */
function parseFormReference(value: unknown, owner: string): string | null {
  if (typeof value !== 'string' || !value.includes('${')) return null;
  const tokens = variableParser.parse(value);
  const token = tokens[0];
  const key = token?.expression.slice(FORM_REFERENCE_PREFIX.length);
  if (
    tokens.length !== 1 || token.raw !== value ||
    !token.expression.startsWith(FORM_REFERENCE_PREFIX) ||
    !/^[A-Za-z0-9_-]+$/.test(key)
  ) {
    throw new FormDomainError('INVALID_DEFINITION', `Condition on ${owner} contains an unsupported variable reference`);
  }
  return key;
}

const OPERATORS = new Set([
  'equals',
  'notEquals',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'notIn',
  'isEmpty',
  'isNotEmpty',
]);

type LeafCondition = {
  field: string;
  operator: string;
  value?: FormJsonValue;
};

type Condition = LeafCondition | { all: Condition[] } | { any: Condition[] } | { not: Condition };

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isEmpty = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

const equal = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

function validateCondition(value: unknown, fieldKeys: Set<string>, owner: string, depth = 0): Condition {
  if (isObject(value) && ['all', 'any', 'not'].some(key => key in value)) {
    const keys = Object.keys(value);
    const group = value[keys[0]];
    if (depth >= MAX_CONDITION_DEPTH || keys.length !== 1 || !['all', 'any', 'not'].includes(keys[0])) {
      throw new FormDomainError('INVALID_DEFINITION', `Invalid condition group on ${owner}`);
    }
    if (keys[0] === 'not') {
      validateCondition(group, fieldKeys, owner, depth + 1);
    } else if (!Array.isArray(group) || group.length === 0 || group.length > MAX_CONDITION_GROUP) {
      throw new FormDomainError('INVALID_DEFINITION', `Condition group on ${owner} must be a bounded non-empty list`);
    } else {
      group.forEach(item => validateCondition(item, fieldKeys, owner, depth + 1));
    }
    return value as Condition;
  }
  if (
    !isObject(value) ||
    typeof value.field !== 'string' ||
    !fieldKeys.has(value.field) ||
    typeof value.operator !== 'string' ||
    !OPERATORS.has(value.operator)
  ) {
    throw new FormDomainError('INVALID_DEFINITION', `Invalid condition on ${owner}`);
  }

  if (
    value.operator !== 'isEmpty' &&
    value.operator !== 'isNotEmpty' &&
    !Object.prototype.hasOwnProperty.call(value, 'value')
  ) {
    throw new FormDomainError('INVALID_DEFINITION', `Condition on ${owner} requires a value`);
  }

  if (Object.keys(value).some(key => !['field', 'operator', 'value'].includes(key))) {
    throw new FormDomainError('INVALID_DEFINITION', `Condition on ${owner} contains unsupported properties`);
  }
  if (value.operator === 'in' || value.operator === 'notIn') {
    if (
      !Array.isArray(value.value) ||
      value.value.length > 100 ||
      value.value.some(item => item !== null && !['string', 'number', 'boolean'].includes(typeof item))
    ) {
      throw new FormDomainError('INVALID_DEFINITION', `Condition on ${owner} requires a bounded scalar list`);
    }
  } else if (
    parseFormReference(value.value, owner) !== null
  ) {
    if (!fieldKeys.has(parseFormReference(value.value, owner) as string)) {
      throw new FormDomainError('INVALID_DEFINITION', `Condition on ${owner} references an unknown field`);
    }
  } else if (
    value.operator !== 'isEmpty' &&
    value.operator !== 'isNotEmpty' &&
    value.value !== null &&
    !['string', 'number', 'boolean'].includes(typeof value.value)
  ) {
    throw new FormDomainError('INVALID_DEFINITION', `Condition on ${owner} requires a scalar value`);
  }

  return value as Condition;
}

function validateConditions(
  conditions: unknown,
  fieldKeys: Set<string>,
  owner: string,
  allowedKeys = ['visibleWhen', 'requiredWhen', 'blockCompletionWhen'],
): void {
  if (conditions === undefined || conditions === null) return;
  if (!isObject(conditions)) {
    throw new FormDomainError('INVALID_DEFINITION', `Conditions on ${owner} must be an object`);
  }

  if (Object.keys(conditions).some(key => !allowedKeys.includes(key))) {
    throw new FormDomainError('INVALID_DEFINITION', `Conditions on ${owner} contain unsupported properties`);
  }

  for (const key of ['visibleWhen', 'requiredWhen', 'blockCompletionWhen', 'when']) {
    if (conditions[key] !== undefined) validateCondition(conditions[key], fieldKeys, owner);
  }
}

export function validateFormDefinition(sections: FormSection[], fields: FormFieldDefinition[]): void {
  if (sections.some(section => RESERVED_FORM_KEYS.includes(section.key))) {
    throw new FormDomainError('INVALID_DEFINITION', 'Reserved section keys are not allowed');
  }
  const fieldKeys = new Set<string>();
  const sectionIds = new Set(sections.map(section => section.id));
  const supportedTypes = new Set([
    'TEXT', 'STRING', 'TEXTAREA', 'EMAIL', 'DATE', 'SELECT', 'RADIO',
    'NUMBER', 'PASS_FAIL', 'CHECKBOX', 'MULTI_SELECT', 'DATA', 'BOM_TABLE',
  ]);

  for (const field of fields) {
    if (RESERVED_FORM_KEYS.includes(field.key) || fieldKeys.has(field.key) || !sectionIds.has(field.sectionId)) {
      throw new FormDomainError('INVALID_DEFINITION', `Duplicate, reserved or unlinked field: ${field.key}`);
    }
    if (!supportedTypes.has(field.fieldType.toUpperCase())) {
      throw new FormDomainError('INVALID_DEFINITION', `Unsupported field type: ${field.fieldType}`);
    }
    if (field.fieldType.toUpperCase() === 'DATA') {
      const source = field.options?.source;
      const mode = field.options?.mode;
      const sourceDefinition = typeof source === 'string' ? getFormDataSource(source) : undefined;
      if (
        !sourceDefinition ||
        (mode !== 'readonly' && mode !== 'prefill') ||
        field.options.valueType !== sourceDefinition.type ||
        Object.keys(field.options).some(key => !['source', 'mode', 'valueType'].includes(key))
      ) {
        throw new FormDomainError('INVALID_DEFINITION', `Invalid system data source or mode on ${field.key}`);
      }
    }
    if (field.fieldType.toUpperCase() === 'BOM_TABLE') {
      const { columns, filter } = field.options || {};
      const allowedColumns = ['plannedQty', 'installedQty', 'installed', 'note'];
      if (
        !Array.isArray(columns) ||
        columns.length === 0 ||
        columns.length > allowedColumns.length ||
        !columns.every((column, index) =>
          typeof column === 'string' && allowedColumns.includes(column) && columns.indexOf(column) === index) ||
        (filter !== undefined && (typeof filter !== 'string' || filter.length > 100)) ||
        Object.keys(field.options || {}).some(key => !['columns', 'filter'].includes(key))
      ) {
        throw new FormDomainError('INVALID_DEFINITION', `Invalid BOM table options on ${field.key}`);
      }
    }
    fieldKeys.add(field.key);
  }

  for (const section of sections) {
    validateConditions(section.conditions, fieldKeys, `section ${section.key}`, ['visibleWhen']);
  }
  for (const field of fields) {
    validateConditions(field.conditions, fieldKeys, `field ${field.key}`);
    if (field.fieldType.toUpperCase() === 'NUMBER') {
      const { min, max } = field.validation || {};
      if ((min !== undefined && (typeof min !== 'number' || !Number.isFinite(min))) ||
          (max !== undefined && (typeof max !== 'number' || !Number.isFinite(max))) ||
          (typeof min === 'number' && typeof max === 'number' && min > max)) {
        throw new FormDomainError('INVALID_DEFINITION', `Invalid numeric bounds on ${field.key}`);
      }
    }
  }
}

function evaluateCondition(condition: Condition, values: FormResponses): boolean {
  if ('all' in condition) return condition.all.every(item => evaluateCondition(item, values));
  if ('any' in condition) return condition.any.some(item => evaluateCondition(item, values));
  if ('not' in condition) return !evaluateCondition(condition.not, values);
  const actual = Object.prototype.hasOwnProperty.call(values, condition.field)
    ? values[condition.field]
    : undefined;
  let expected = condition.value;
  const reference = parseFormReference(expected, 'condition');
  if (reference !== null) {
    expected = Object.prototype.hasOwnProperty.call(values, reference) ? values[reference] : undefined;
  }
  switch (condition.operator) {
    case 'equals': return equal(actual, expected);
    case 'notEquals': return !equal(actual, expected);
    case 'gt': return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'gte': return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case 'lt': return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case 'lte': return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case 'in': return Array.isArray(expected) && expected.some(item => equal(actual, item));
    case 'notIn': return Array.isArray(expected) && !expected.some(item => equal(actual, item));
    case 'isEmpty': return isEmpty(actual);
    case 'isNotEmpty': return !isEmpty(actual);
    default: return false;
  }
}

function conditionMatches(conditions: unknown, key: 'visibleWhen' | 'requiredWhen' | 'blockCompletionWhen', values: FormResponses): boolean {
  if (!isObject(conditions) || conditions[key] === undefined) return false;
  return evaluateCondition(conditions[key] as Condition, values);
}

function valueError(field: FormFieldDefinition, value: FormJsonValue): string | null {
  if (isEmpty(value)) return null;
  const type = field.fieldType.toUpperCase();
  switch (type) {
    case 'TEXT':
    case 'STRING':
    case 'TEXTAREA':
    case 'EMAIL':
    case 'DATE':
    case 'SELECT':
    case 'RADIO':
      return typeof value === 'string' ? null : 'must be a string';
    case 'NUMBER': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return 'must be a finite number';
      const min = field.validation?.min;
      const max = field.validation?.max;
      if (typeof min === 'number' && value < min) return `must be at least ${min}`;
      if (typeof max === 'number' && value > max) return `must be at most ${max}`;
      return null;
    }
    case 'PASS_FAIL':
      return value === 'PASS' || value === 'FAIL' ? null : 'must be PASS or FAIL';
    case 'CHECKBOX':
      return typeof value === 'boolean' ? null : 'must be a boolean';
    case 'MULTI_SELECT':
      return Array.isArray(value) && value.every(item => typeof item === 'string') ? null : 'must be a list of strings';
    case 'DATA': {
      const source = typeof field.options?.source === 'string' ? getFormDataSource(field.options.source) : undefined;
      if (!source || field.options.valueType !== source.type) return 'has an invalid system data source';
      if (source.type === 'number') return typeof value === 'number' && Number.isFinite(value) ? null : 'must be a finite number';
      if (source.type === 'boolean') return typeof value === 'boolean' ? null : 'must be a boolean';
      return typeof value === 'string' ? null : 'must be a string';
    }
    case 'BOM_TABLE': {
      if (!Array.isArray(value) || value.length > 1000) return 'must be a list of at most 1000 BOM items';
      const expectedKeys = ['bomItemId', 'name', 'unit', 'plannedQty', 'installedQty', 'installed', 'note'];
      const seen = new Set<number>();
      for (const row of value) {
        if (
          !isObject(row) ||
          Object.keys(row).some(key => !expectedKeys.includes(key)) ||
          Object.keys(row).length !== expectedKeys.length ||
          !Number.isSafeInteger(row.bomItemId) || (row.bomItemId as number) < 1 ||
          seen.has(row.bomItemId as number) ||
          typeof row.name !== 'string' ||
          typeof row.unit !== 'string' ||
          typeof row.plannedQty !== 'number' || !Number.isFinite(row.plannedQty) || row.plannedQty < 0 ||
          (row.installedQty !== null &&
            (typeof row.installedQty !== 'number' || !Number.isFinite(row.installedQty) || row.installedQty < 0)) ||
          typeof row.installed !== 'boolean' ||
          typeof row.note !== 'string'
        ) return 'contains an invalid BOM item';
        seen.add(row.bomItemId as number);
        if (row.installed && !(typeof row.installedQty === 'number' && row.installedQty > 0)) {
          return 'installed items require an installed quantity greater than zero';
        }
        if (typeof row.installedQty === 'number' && row.installedQty > row.plannedQty && row.note.trim() === '') {
          return 'an installation note is required when installed quantity exceeds the plan';
        }
      }
      return null;
    }
    default:
      return 'has an unsupported type';
  }

}

export function validateBomTableMutation(original: unknown, submitted: unknown): string | null {
  if (!Array.isArray(original) || !Array.isArray(submitted) || original.length !== submitted.length) {
    return 'BOM item identities cannot be changed';
  }
  const originalById = new Map<number, Record<string, unknown>>();
  for (const item of original) {
    if (!isObject(item) || !Number.isSafeInteger(item.bomItemId)) return 'The original BOM snapshot is invalid';
    originalById.set(item.bomItemId as number, item);
  }
  for (const item of submitted) {
    if (!isObject(item) || !Number.isSafeInteger(item.bomItemId)) return 'BOM item identities cannot be changed';
    const saved = originalById.get(item.bomItemId as number);
    if (!saved) return 'BOM item identities cannot be changed';
    for (const key of ['bomItemId', 'name', 'unit', 'plannedQty']) {
      if (item[key] !== saved[key]) return `BOM item ${key} cannot be changed`;
    }
    originalById.delete(item.bomItemId as number);
  }
  return originalById.size ? 'BOM item identities cannot be changed' : null;
}

export function validateFormResponses(
  sections: FormSection[],
  fields: FormFieldDefinition[],
  values: FormResponses,
  requireRequired: boolean,
): string[] {
  const errors: string[] = [];
  const fieldByKey = new Map(fields.map(field => [field.key, field]));
  const sectionById = new Map(sections.map(section => [section.id, section]));

  for (const key of Object.keys(values)) {
    if (!fieldByKey.has(key)) errors.push(`${key}: unknown field`);
  }

  for (const field of fields) {
    const section = sectionById.get(field.sectionId);
    const visible = (
      !isObject(section?.conditions) ||
      section.conditions.visibleWhen === undefined ||
      conditionMatches(section.conditions, 'visibleWhen', values)
    ) && (
      !isObject(field.conditions) ||
      field.conditions.visibleWhen === undefined ||
      conditionMatches(field.conditions, 'visibleWhen', values)
    );
    const value = Object.prototype.hasOwnProperty.call(values, field.key)
      ? values[field.key]
      : undefined;
    if (value !== undefined && value !== null) {
      const error = valueError(field, value);
      if (error) errors.push(`${field.key}: ${error}`);
    }
    if (!visible) continue;

    const required = field.required ||
      conditionMatches(field.conditions, 'requiredWhen', values);
    if (requireRequired && required && isEmpty(value)) {
      errors.push(`${field.key}: is required`);
      continue;
    }

    if (
      requireRequired &&
      conditionMatches(field.conditions, 'blockCompletionWhen', values)
    ) {
      errors.push(`${field.key}: blocks completion`);
    }
    if (requireRequired && field.fieldType.toUpperCase() === 'PASS_FAIL' && value === 'FAIL') {
      errors.push(`${field.key}: FAIL blocks completion`);
    }
  }
  return errors;
}

export function validateFormConditionShape(
  conditions: unknown,
  fieldKeys: Set<string>,
  owner: string,
  allowedKeys?: string[],
): void {
  validateConditions(conditions, fieldKeys, owner, allowedKeys);
}

export interface AssignmentRuleLike {
  id?: number;
  priority: number;
  active: boolean;
  conditions: unknown;
  assignedUserId: number | null;
  assignedTeamId: number | null;
}

/**
 * Picks the first active assignment rule (lowest priority value, then id) whose
 * `conditions.when` matches the stored responses; a rule without `when` always matches.
 */
export function resolveAssignment<T extends AssignmentRuleLike>(rules: T[], values: FormResponses): T | null {
  const ordered = [...rules]
    .filter(rule => rule.active)
    .sort((a, b) => a.priority - b.priority || (a.id ?? 0) - (b.id ?? 0));
  for (const rule of ordered) {
    const when = isObject(rule.conditions) ? rule.conditions.when : undefined;
    if (when === undefined || evaluateCondition(when as Condition, values)) return rule;
  }
  return null;
}

/** Evaluates a stored visibility/required/block condition on a definition against responses. */
export function evaluateFormCondition(
  conditions: unknown,
  key: 'visibleWhen' | 'requiredWhen' | 'blockCompletionWhen',
  values: FormResponses,
): boolean {
  return conditionMatches(conditions, key, values);
}

/** DEVICE_PRECONFIGURATION must never create installedIn (assembly) relations. */
export function assertRelationAllowed(procedureType: string, relationType: string): void {
  if (procedureType === 'DEVICE_PRECONFIGURATION' && relationType === 'installedIn') {
    throw new FormDomainError('INVALID_DEFINITION', 'installedIn relations are not allowed in DEVICE_PRECONFIGURATION');
  }
}

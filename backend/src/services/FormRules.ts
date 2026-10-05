import { FormDomainError } from '../errors/FormDomainError';
import { FormFieldDefinition } from '../entities/FormFieldDefinition';
import { FormSection } from '../entities/FormSection';
import { FormJsonValue } from '../entities/FormTypes';
import { FormResponses } from '../dto/FormServiceDto';

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

type Condition = {
  field: string;
  operator: string;
  value?: FormJsonValue;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isEmpty = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

const equal = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

function validateCondition(value: unknown, fieldKeys: Set<string>, owner: string): Condition {
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

  for (const key of ['visibleWhen', 'requiredWhen', 'blockCompletionWhen']) {
    if (conditions[key] !== undefined) validateCondition(conditions[key], fieldKeys, owner);
  }
}

export function validateFormDefinition(sections: FormSection[], fields: FormFieldDefinition[]): void {
  const fieldKeys = new Set<string>();
  const sectionIds = new Set(sections.map(section => section.id));
  const supportedTypes = new Set([
    'TEXT', 'STRING', 'TEXTAREA', 'EMAIL', 'DATE', 'SELECT', 'RADIO',
    'NUMBER', 'PASS_FAIL', 'CHECKBOX', 'MULTI_SELECT',
  ]);

  for (const field of fields) {
    if (fieldKeys.has(field.key) || !sectionIds.has(field.sectionId)) {
      throw new FormDomainError('INVALID_DEFINITION', `Duplicate or unlinked field: ${field.key}`);
    }
    if (!supportedTypes.has(field.fieldType.toUpperCase())) {
      throw new FormDomainError('INVALID_DEFINITION', `Unsupported field type: ${field.fieldType}`);
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
  const actual = Object.prototype.hasOwnProperty.call(values, condition.field)
    ? values[condition.field]
    : undefined;
  const expected = condition.value;
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
    default:
      return 'has an unsupported type';
  }
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

import { z } from 'zod';
import type { FormCondition, FormField, FormVersion } from '../../types/forms.types';

export type FormValues = Record<string, unknown>;

const reservedKeys = new Set([...Object.getOwnPropertyNames(Object.prototype), 'prototype']);
const supportedTypes = new Set([
  'TEXT', 'STRING', 'TEXTAREA', 'EMAIL', 'DATE', 'SELECT', 'RADIO',
  'NUMBER', 'PASS_FAIL', 'CHECKBOX', 'MULTI_SELECT',
]);
const operators = new Set([
  'equals', 'notEquals', 'gt', 'gte', 'lt', 'lte',
  'in', 'notIn', 'isEmpty', 'isNotEmpty',
]);
const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isSafeKey = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value) && !reservedKeys.has(value);
const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const isScalar = (value: unknown): boolean =>
  value === null || ['string', 'number', 'boolean'].includes(typeof value);
const equal = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

export function isEmpty(value: unknown): boolean {
  return value === undefined || value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);
}

export function matchesCondition(condition: FormCondition | undefined, values: FormValues): boolean {
  if (condition === undefined) return true;
  const actual = hasOwn(values, condition.field) ? values[condition.field] : undefined;
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

export function isFieldVisible(
  version: FormVersion,
  field: FormVersion['fields'][number],
  values: FormValues,
): boolean {
  const section = version.sections.find(item => item.id === field.sectionId);
  return matchesCondition(section?.conditions?.visibleWhen, values) &&
    matchesCondition(field.conditions?.visibleWhen, values);
}

export function isFieldRequired(field: FormField, values: FormValues): boolean {
  return field.required ||
    (field.conditions?.requiredWhen !== undefined && matchesCondition(field.conditions.requiredWhen, values));
}

function conditionsError(
  conditions: unknown,
  fieldKeys: Set<string>,
  allowedKeys: string[],
): string | null {
  if (conditions === undefined || conditions === null) return null;
  if (!isObject(conditions)) return 'Conditions must be an object';
  for (const [key, condition] of Object.entries(conditions)) {
    if (!allowedKeys.includes(key)) return 'Unsupported condition property';
    if (condition === undefined) continue;
    if (!isObject(condition) || typeof condition.field !== 'string' ||
        !fieldKeys.has(condition.field) || typeof condition.operator !== 'string' ||
        !operators.has(condition.operator)) {
      return 'Invalid condition reference or operator';
    }
    if (Object.keys(condition).some(property => !['field', 'operator', 'value'].includes(property))) {
      return 'Unsupported condition properties';
    }
    if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') continue;
    if (!hasOwn(condition, 'value')) return 'Condition requires a value';
    if (condition.operator === 'in' || condition.operator === 'notIn') {
      if (!Array.isArray(condition.value) || condition.value.length > 100 ||
          !condition.value.every(isScalar)) {
        return 'Condition requires a bounded scalar list';
      }
    } else if (!isScalar(condition.value)) {
      return 'Condition requires a scalar value';
    }
  }
  return null;
}

export function getDefinitionError(version: FormVersion): string | null {
  if (!isObject(version) || !Array.isArray(version.sections) || !Array.isArray(version.fields)) {
    return 'Invalid form definition';
  }
  const sectionKeys = new Set<string>();
  const sectionIds = new Set<number>();
  for (const section of version.sections) {
    if (!isObject(section) || !isSafeKey(section.key) || sectionKeys.has(section.key) ||
        !isId(section.id) || sectionIds.has(section.id)) {
      return 'Invalid or duplicate section key/id';
    }
    sectionKeys.add(section.key);
    sectionIds.add(section.id);
  }
  const fieldKeys = new Set<string>();
  for (const field of version.fields) {
    if (!isObject(field) || !isSafeKey(field.key) || fieldKeys.has(field.key) ||
        !sectionIds.has(field.sectionId)) {
      return 'Invalid, duplicate or unlinked field key';
    }
    if (typeof field.fieldType !== 'string' || !supportedTypes.has(field.fieldType.toUpperCase())) {
      return `Unsupported field type: ${field.fieldType}`;
    }
    if (field.fieldType.toUpperCase() === 'NUMBER') {
      const { min, max } = field.validation || {};
      if ((min !== undefined && (typeof min !== 'number' || !Number.isFinite(min))) ||
          (max !== undefined && (typeof max !== 'number' || !Number.isFinite(max))) ||
          (typeof min === 'number' && typeof max === 'number' && min > max)) {
        return `Invalid numeric bounds on ${field.key}`;
      }
    }
    fieldKeys.add(field.key);
  }
  for (const section of version.sections) {
    const error = conditionsError(section.conditions, fieldKeys, ['visibleWhen']);
    if (error) return `${section.key}: ${error}`;
  }
  for (const field of version.fields) {
    const error = conditionsError(field.conditions, fieldKeys, [
      'visibleWhen', 'requiredWhen', 'blockCompletionWhen',
    ]);
    if (error) return `${field.key}: ${error}`;
  }
  return null;
}

function valueError(field: FormField, value: unknown): string | null {
  if (isEmpty(value)) return null;
  switch (field.fieldType.toUpperCase()) {
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
      const { min, max } = field.validation || {};
      if (typeof min === 'number' && value < min) return `must be at least ${min}`;
      if (typeof max === 'number' && value > max) return `must be at most ${max}`;
      return null;
    }
    case 'PASS_FAIL':
      return value === 'PASS' || value === 'FAIL' ? null : 'must be PASS or FAIL';
    case 'CHECKBOX':
      return typeof value === 'boolean' ? null : 'must be a boolean';
    case 'MULTI_SELECT':
      return Array.isArray(value) && value.every(item => typeof item === 'string')
        ? null : 'must be a list of strings';
    default:
      return 'has an unsupported type';
  }
}

export function buildFormSchema(version: FormVersion, requireRequired = true) {
  const definitionError = getDefinitionError(version);
  if (definitionError) throw new Error(definitionError);
  const shape: Record<string, z.ZodOptional<z.ZodUnknown>> = Object.create(null);
  for (const field of version.fields) shape[field.key] = z.unknown().optional();

  // Keep raw answers until all cross-field rules have run, including hidden and missing answers.
  return z.object(shape).catchall(z.unknown()).superRefine((values, context) => {
    for (const key of Object.keys(values)) {
      if (!hasOwn(shape, key)) context.addIssue({ code: 'custom', path: [key], message: 'unknown field' });
    }
    for (const field of version.fields) {
      const value = hasOwn(values, field.key) ? values[field.key] : undefined;
      const error = valueError(field, value);
      if (error) context.addIssue({ code: 'custom', path: [field.key], message: error });
      if (requireRequired && isFieldVisible(version, field, values) &&
          isFieldRequired(field, values) && isEmpty(value)) {
        context.addIssue({ code: 'custom', path: [field.key], message: 'is required' });
      }
    }
  });
}

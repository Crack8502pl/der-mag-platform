import { describe, expect, expectTypeOf, it } from 'vitest';
import type { FormCondition, FormField, FormVersion } from '../../types/forms.types';
import type { FormValues } from './formSchema';
import {
  buildFormSchema, getDefinitionError, isEmpty, isFieldRequired, isFieldVisible, matchesCondition,
} from './formSchema';

function field(overrides: Partial<FormVersion['fields'][number]> = {}): FormVersion['fields'][number] {
  return {
    id: 1, sectionId: 1, key: 'answer', label: 'Answer', fieldType: 'TEXT',
    required: false, sortOrder: 0, validation: {}, options: {}, conditions: {}, ...overrides,
  };
}

function version(fields = [field()]): FormVersion {
  return {
    id: 1, templateId: 1, version: 1, status: 'PUBLISHED', title: 'Form', description: null,
    kind: 'FORM', procedureType: 'FIELD_INSTALLATION', settings: {}, publishedAt: null,
    sections: [{ id: 1, key: 'section', title: 'Section', sortOrder: 0, conditions: {} }],
    fields, assignmentRules: [],
  };
}

const condition = (operator: string, value?: FormCondition['value']): FormCondition =>
  ({ field: 'answer', operator, value });

describe('emptiness and conditions', () => {
  it.each([undefined, null, '', ' \n\t ', []])('treats %j as empty', value => {
    expect(isEmpty(value)).toBe(true);
  });
  it.each([false, 0, {}, [''], 'text', NaN])('does not treat %j as empty', value => {
    expect(isEmpty(value)).toBe(false);
  });
  it('defaults missing visibility conditions to true and reads only own answers', () => {
    expect(matchesCondition(undefined, {})).toBe(true);
    expect(matchesCondition(condition('isEmpty'), Object.create({ answer: 'inherited' }))).toBe(true);
  });
  it.each([
    ['equals', 'yes', 'yes', true], ['equals', 1, '1', false],
    ['notEquals', 'yes', 'no', true], ['notEquals', false, false, false],
    ['gt', 3, 2, true], ['gt', 2, 2, false], ['gt', '3', 2, false],
    ['gte', 2, 2, true], ['gte', 1, 2, false], ['gte', 3, '2', false],
    ['lt', 1, 2, true], ['lt', 2, 2, false], ['lt', '1', 2, false],
    ['lte', 2, 2, true], ['lte', 3, 2, false], ['lte', 1, '2', false],
    ['in', 'yes', ['yes', 'no'], true], ['in', 'other', ['yes'], false],
    ['in', 'yes', 'yes', false],
    ['notIn', 'other', ['yes'], true], ['notIn', 'yes', ['yes'], false],
    ['notIn', 'yes', 'yes', false],
    ['isEmpty', [], undefined, true], ['isEmpty', 0, undefined, false],
    ['isNotEmpty', false, undefined, true], ['isNotEmpty', null, undefined, false],
    ['unsupported', 'yes', 'yes', false],
  ])('evaluates %s with %j against %j', (operator, actual, expected, result) => {
    expect(matchesCondition(condition(operator as string, expected as FormCondition['value']), {
      answer: actual,
    })).toBe(result);
  });
});

describe('visibility and required rules', () => {
  it('requires both field and section visibility and treats missing conditions as visible', () => {
    const definition = version();
    const answer = definition.fields[0];
    expect(isFieldVisible(definition, answer, {})).toBe(true);
    definition.sections[0].conditions.visibleWhen = condition('equals', 'yes');
    expect(isFieldVisible(definition, answer, { answer: 'no' })).toBe(false);
    expect(isFieldVisible(definition, answer, { answer: 'yes' })).toBe(true);
    answer.conditions.visibleWhen = condition('equals', 'no');
    expect(isFieldVisible(definition, answer, { answer: 'yes' })).toBe(false);
    definition.sections[0].conditions = {};
    expect(isFieldVisible(definition, answer, { answer: 'no' })).toBe(true);
  });
  it('combines static and conditional required without making every field required', () => {
    expect(isFieldRequired(field(), {})).toBe(false);
    expect(isFieldRequired(field({ required: true }), {})).toBe(true);
    const answer = field({ conditions: { requiredWhen: condition('equals', 'yes') } });
    expect(isFieldRequired(answer, { answer: 'yes' })).toBe(true);
    expect(isFieldRequired(answer, { answer: 'no' })).toBe(false);
    expect(isFieldRequired({ ...answer, conditions: undefined } as unknown as FormField, {})).toBe(false);
  });
});

describe('definition safety', () => {
  it('accepts the eleven supported types, lowercase types and safe key characters', () => {
    for (const fieldType of [
      'TEXT', 'STRING', 'TEXTAREA', 'EMAIL', 'DATE', 'SELECT', 'RADIO',
      'NUMBER', 'PASS_FAIL', 'CHECKBOX', 'MULTI_SELECT', 'number',
    ]) {
      expect(getDefinitionError(version([field({ fieldType, key: 'a_1-Z' })]))).toBeNull();
    }
    expect(getDefinitionError(version([]))).toBeNull();
  });
  it.each([
    '__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty',
    'nested.answer', 'answer[0]', '', 'answer space', 'a/b',
  ])('rejects unsafe field and section key %s before schema construction', key => {
    const definition = version([field({ key })]);
    expect(getDefinitionError(definition)).not.toBeNull();
    expect(() => buildFormSchema(definition)).toThrow();
    const badSection = version();
    badSection.sections[0].key = key;
    expect(getDefinitionError(badSection)).not.toBeNull();
  });
  it('rejects malformed definitions, duplicate keys, invalid section ids and unlinked fields', () => {
    for (const definition of [null, {}, { sections: {}, fields: [] }, { sections: [], fields: null }]) {
      expect(getDefinitionError(definition as unknown as FormVersion)).not.toBeNull();
    }
    expect(getDefinitionError(version([null as unknown as ReturnType<typeof field>]))).not.toBeNull();
    expect(getDefinitionError(version([field(), field({ id: 2 })]))).not.toBeNull();
    expect(getDefinitionError(version([field({ sectionId: 2 })]))).not.toBeNull();
    for (const id of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      const definition = version();
      definition.sections[0].id = id;
      expect(getDefinitionError(definition)).not.toBeNull();
    }
    const definition = version();
    definition.sections.push({ ...definition.sections[0], id: 2 });
    expect(getDefinitionError(definition)).not.toBeNull();
    definition.sections[1] = { ...definition.sections[0], key: 'other' };
    expect(getDefinitionError(definition)).not.toBeNull();
    definition.sections = [null as unknown as FormVersion['sections'][number]];
    expect(getDefinitionError(definition)).not.toBeNull();
  });
  it.each(['BOOLEAN', 'FILE', '', null])('rejects unsupported type %j', fieldType => {
    expect(getDefinitionError(version([field({ fieldType: fieldType as string })]))).not.toBeNull();
  });
  it.each([null, undefined, [], 'invalid', 1])('rejects malformed options %j before rendering', options => {
    expect(getDefinitionError(version([field({
      options: options as unknown as FormField['options'],
    })]))).not.toBeNull();
  });
  it.each([
    { min: '1' }, { max: '2' }, { min: NaN }, { max: Infinity }, { min: 2, max: 1 },
  ])('rejects malformed number bounds %j', validation => {
    expect(getDefinitionError(version([field({ fieldType: 'NUMBER', validation })]))).not.toBeNull();
  });
  it('allows valid bounds and absent nullable backend conditions/validation', () => {
    const answer = field({ fieldType: 'NUMBER', validation: { min: 0, max: 1 } });
    expect(getDefinitionError(version([answer]))).toBeNull();
    answer.validation = null as unknown as FormField['validation'];
    answer.conditions = null as unknown as FormField['conditions'];
    const definition = version([answer]);
    definition.sections[0].conditions = undefined as unknown as FormField['conditions'];
    expect(getDefinitionError(definition)).toBeNull();
  });
  it.each([
    [], 'bad', { other: condition('equals', 'yes') },
    { visibleWhen: null }, { visibleWhen: { field: 'missing', operator: 'isEmpty' } },
    { visibleWhen: { field: 'answer', operator: 'bad' } },
    { visibleWhen: { field: 'answer', operator: 'equals' } },
    { visibleWhen: { ...condition('equals', 'yes'), extra: true } },
    { visibleWhen: condition('equals', []) },
    { visibleWhen: condition('equals', undefined) },
    { visibleWhen: condition('in', 'yes') },
    { visibleWhen: condition('notIn', Array(101).fill('yes')) },
    { visibleWhen: condition('in', [{}] as unknown as string[]) },
  ])('rejects malformed condition container %j', conditions => {
    expect(getDefinitionError(version([field({
      conditions: conditions as unknown as FormField['conditions'],
    })]))).not.toBeNull();
  });
  it('validates section conditions, but accepts emptiness and bounded scalar lists', () => {
    const definition = version();
    definition.sections[0].conditions.requiredWhen = condition('isEmpty');
    expect(getDefinitionError(definition)).not.toBeNull();
    definition.sections[0].conditions = { visibleWhen: { field: 'answer', operator: 'isEmpty' } };
    definition.fields[0].conditions = {
      requiredWhen: condition('notIn', [null, 'yes', 1, false]),
      blockCompletionWhen: condition('isNotEmpty'),
      visibleWhen: undefined as unknown as FormCondition,
    };
    expect(getDefinitionError(definition)).toBeNull();
  });
});

describe('response schema', () => {
  it.each(['TEXT', 'STRING', 'TEXTAREA', 'EMAIL', 'DATE', 'SELECT', 'RADIO'])(
    'validates %s as strings without extra format or option restrictions', fieldType => {
      const schema = buildFormSchema(version([field({ fieldType })]));
      expect(schema.safeParse({ answer: 'not a date/email/option' }).success).toBe(true);
      expect(schema.safeParse({ answer: 1 }).success).toBe(false);
    },
  );
  it.each([
    ['NUMBER', 0, true], ['NUMBER', '0', false], ['NUMBER', NaN, false], ['NUMBER', Infinity, false],
    ['PASS_FAIL', 'PASS', true], ['PASS_FAIL', 'FAIL', true], ['PASS_FAIL', 'pass', false],
    ['CHECKBOX', false, true], ['CHECKBOX', true, true], ['CHECKBOX', 'true', false],
    ['MULTI_SELECT', ['a', 'b'], true], ['MULTI_SELECT', [1], false], ['MULTI_SELECT', 'a', false],
  ])('validates %s answer %j', (fieldType, answer, valid) => {
    expect(buildFormSchema(version([field({ fieldType })])).safeParse({ answer }).success).toBe(valid);
  });
  it('enforces inclusive numeric bounds without coercion', () => {
    const schema = buildFormSchema(version([field({
      fieldType: 'number', validation: { min: 1, max: 3 },
    })]));
    for (const answer of [1, 2, 3]) expect(schema.safeParse({ answer }).success).toBe(true);
    for (const [answer, message] of [[0, 'must be at least 1'], [4, 'must be at most 3']] as const) {
      const result = schema.safeParse({ answer });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0]).toMatchObject({ path: ['answer'], message });
    }
  });
  it('allows every backend empty value for optional fields irrespective of type', () => {
    for (const fieldType of ['TEXT', 'NUMBER', 'CHECKBOX', 'PASS_FAIL', 'MULTI_SELECT']) {
      const schema = buildFormSchema(version([field({ fieldType })]));
      for (const answer of [undefined, null, '', ' \n ', []]) {
        expect(schema.safeParse({ answer }).success).toBe(true);
      }
      expect(schema.parse({})).toEqual({});
    }
  });
  it('requires visible mandatory answers but considers false and zero present', () => {
    const schema = buildFormSchema(version([
      field({ required: true }),
      field({ id: 2, key: 'check', fieldType: 'CHECKBOX', required: true }),
      field({ id: 3, key: 'number', fieldType: 'NUMBER', required: true }),
    ]));
    expect(schema.safeParse({ answer: 'yes', check: false, number: 0 }).success).toBe(true);
    for (const answer of [undefined, null, '', ' ', []]) {
      const result = schema.safeParse({ answer, check: false, number: 0 });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: ['answer'], message: 'is required',
      }));
    }
  });
  it('uses complete raw answers for dynamic rules on every parse', () => {
    const definition = version([
      field({ key: 'trigger', fieldType: 'CHECKBOX' }),
      field({ id: 2, conditions: { requiredWhen: { field: 'trigger', operator: 'equals', value: true } } }),
    ]);
    const schema = buildFormSchema(definition);
    expect(schema.safeParse({ trigger: false }).success).toBe(true);
    expect(schema.safeParse({ trigger: true }).success).toBe(false);
    expect(schema.safeParse({ trigger: true, answer: 'given' }).success).toBe(true);
    expect(schema.safeParse({ trigger: false }).success).toBe(true);
    definition.fields[1].conditions.requiredWhen = { field: 'trigger', operator: 'isEmpty' };
    const missingSchema = buildFormSchema(definition);
    expect(missingSchema.safeParse({}).success).toBe(false);
    expect(missingSchema.safeParse({ trigger: false }).success).toBe(true);
  });
  it('infers FormValues and distinguishes missing answers from explicit null in conditions', () => {
    const schema = buildFormSchema(version([
      field({ key: 'trigger' }),
      field({ id: 2, conditions: { requiredWhen: { field: 'trigger', operator: 'equals', value: null } } }),
    ]));
    const parsed = schema.parse({});
    expectTypeOf(parsed).toEqualTypeOf<FormValues>();
    expect(Object.prototype.hasOwnProperty.call(parsed, 'trigger')).toBe(false);
    expect(parsed.trigger).toBeUndefined();
    expect(schema.safeParse({ trigger: undefined }).success).toBe(true);
    expect(schema.safeParse({ trigger: null }).success).toBe(false);
    expect(schema.parse({ trigger: null, answer: 'given' })).toEqual({ trigger: null, answer: 'given' });
  });
  it('preserves known hidden answers and validates their types but skips hidden required fields', () => {
    const definition = version([
      field({ key: 'trigger' }),
      field({
        id: 2, fieldType: 'NUMBER', required: true,
        conditions: { visibleWhen: { field: 'trigger', operator: 'equals', value: 'show' } },
      }),
    ]);
    const schema = buildFormSchema(definition);
    expect(schema.parse({ trigger: 'hide', answer: 12 })).toEqual({ trigger: 'hide', answer: 12 });
    expect(schema.safeParse({ trigger: 'hide' }).success).toBe(true);
    expect(schema.safeParse({ trigger: 'show' }).success).toBe(false);
    expect(schema.safeParse({ trigger: 'hide', answer: 'invalid' }).success).toBe(false);
    definition.sections[0].conditions.visibleWhen = { field: 'trigger', operator: 'equals', value: 'section' };
    expect(buildFormSchema(definition).safeParse({ trigger: 'show' }).success).toBe(true);
  });
  it('reports invalid driver types alongside required errors rather than aborting cross-field rules', () => {
    const schema = buildFormSchema(version([
      field({ key: 'trigger', fieldType: 'NUMBER' }),
      field({ id: 2, conditions: { requiredWhen: { field: 'trigger', operator: 'equals', value: 'raw' } } }),
    ]));
    const result = schema.safeParse({ trigger: 'raw' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map(issue => issue.path)).toEqual([['trigger'], ['answer']]);
  });
  it('draft validation skips required but still rejects malformed values', () => {
    const schema = buildFormSchema(version([field({ required: true, fieldType: 'NUMBER' })]), false);
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ answer: 'wrong' }).success).toBe(false);
  });
  it('does not apply blockCompletionWhen or FAIL completion policy', () => {
    const schema = buildFormSchema(version([field({
      required: true, fieldType: 'PASS_FAIL',
      conditions: { blockCompletionWhen: condition('equals', 'FAIL') },
    })]));
    expect(schema.parse({ answer: 'FAIL' })).toEqual({ answer: 'FAIL' });
  });
  it('rejects unknown keys rather than silently removing them', () => {
    const result = buildFormSchema(version()).safeParse({ answer: 'yes', extra: 1 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]).toMatchObject({ path: ['extra'], message: 'unknown field' });
  });
});

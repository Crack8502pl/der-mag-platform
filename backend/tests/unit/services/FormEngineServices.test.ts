import { AppDataSource } from '../../../src/config/database';
import { FormApproval } from '../../../src/entities/FormApproval';
import { FormAssignmentRule } from '../../../src/entities/FormAssignmentRule';
import { FormFieldDefinition } from '../../../src/entities/FormFieldDefinition';
import { FormFieldValue } from '../../../src/entities/FormFieldValue';
import { FormInstance } from '../../../src/entities/FormInstance';
import { FormSection } from '../../../src/entities/FormSection';
import { Task } from '../../../src/entities/Task';
import { FormTemplate } from '../../../src/entities/FormTemplate';
import { FormTemplateVersion } from '../../../src/entities/FormTemplateVersion';
import { FormTrigger } from '../../../src/entities/FormTrigger';
import { FormApprovalDecision, FormInstanceStatus, FormVersionStatus } from '../../../src/entities/FormTypes';
import { FormDomainError } from '../../../src/errors/FormDomainError';
import { FormApprovalService } from '../../../src/services/FormApprovalService';
import { FormInstanceService } from '../../../src/services/FormInstanceService';
import { FormTemplateService } from '../../../src/services/FormTemplateService';
import {
  assertRelationAllowed, evaluateFormCondition, resolveAssignment, validateFormDefinition, validateFormResponses,
} from '../../../src/services/FormRules';

jest.mock('../../../src/config/database', () => ({ AppDataSource: {} }));

const repository = (overrides: Record<string, jest.Mock> = {}) => ({
  create: jest.fn((value: any) => value),
  save: jest.fn(async (value: any) => value),
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  delete: jest.fn(),
  ...overrides,
});

const repositoryMap = (entries: Array<[unknown, any]>) => new Map<unknown, any>(entries);

function harness(repositories: Map<unknown, any>) {
  const manager = {
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
    query: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {
    manager,
    getRepository: manager.getRepository,
    transaction: jest.fn((callback: (manager: any) => unknown) => callback(manager)),
  };
  return { manager, dataSource: dataSource as any };
}

const section = { id: 1, templateVersionId: 7, key: 'main', conditions: {} } as FormSection;

const fields = [
  { id: 10, templateVersionId: 7, sectionId: 1, key: 'amount', fieldType: 'NUMBER', required: true, validation: { min: 3, max: 8 }, conditions: {} },
  { id: 11, templateVersionId: 7, sectionId: 1, key: 'result', fieldType: 'PASS_FAIL', required: true, validation: {}, conditions: {} },
  { id: 12, templateVersionId: 7, sectionId: 1, key: 'enabled', fieldType: 'CHECKBOX', required: false, validation: {}, conditions: {} },
  { id: 13, templateVersionId: 7, sectionId: 1, key: 'details', fieldType: 'TEXT', required: false, validation: {}, conditions: {
    visibleWhen: { field: 'enabled', operator: 'equals', value: true },
    requiredWhen: { field: 'enabled', operator: 'equals', value: true },
  } },
] as FormFieldDefinition[];

describe('FormRules', () => {
  it('rejects required fields, invalid types, and NUMBER values outside stored bounds', () => {
    expect(validateFormResponses([section], fields, { amount: 2, result: 'PASS', extra: true }, true)).toEqual([
      'extra: unknown field',
      'amount: must be at least 3',
    ]);
    expect(validateFormResponses([section], fields, { amount: '4', result: 'PASS' }, true)).toContain(
      'amount: must be a finite number',
    );
    expect(validateFormResponses([section], fields, { amount: 9, result: 'PASS' }, true)).toContain(
      'amount: must be at most 8',
    );
    expect(validateFormResponses([section], fields, { amount: 4 }, true)).toContain('result: is required');
  });

  it('blocks completion for FAIL and evaluates conditional visibility and required rules', () => {
    const failed = validateFormResponses([section], fields, { amount: 4, result: 'FAIL', enabled: false }, true);
    expect(failed).toContain('result: FAIL blocks completion');
    expect(failed).not.toContain('details: is required');

    const visibleAndRequired = validateFormResponses(
      [section],
      fields,
      { amount: 4, result: 'PASS', enabled: true },
      true,
    );
    expect(visibleAndRequired).toContain('details: is required');
    expect(validateFormResponses(
      [section],
      fields,
      { amount: 4, result: 'PASS', enabled: false, details: 42 as any },
      false,
    )).toContain('details: must be a string');
    expect(validateFormResponses([section], [fields[0]], { amount: '   ' }, true))
      .toContain('amount: is required');
    expect(validateFormResponses([section], [
      { ...fields[0], key: 'toString', fieldType: 'TEXT' } as FormFieldDefinition,
    ], {}, true)).toContain('toString: is required');
  });

  it('validates stored field types and declarative condition references before publication', () => {
    expect(() => validateFormDefinition([section], fields)).not.toThrow();
    expect(() => validateFormDefinition([section], [
      ...fields,
      { ...fields[3], id: 14, key: 'broken', conditions: { visibleWhen: { field: 'missing', operator: 'equals', value: true } } },
    ])).toThrow(FormDomainError);
    expect(() => validateFormDefinition([section], [
      { ...fields[0], validation: { min: 9, max: 2 } },
    ])).toThrow(FormDomainError);
  });

  it.each([
    ['equals', 4, true],
    ['notEquals', 4, false],
    ['gt', 2, true],
    ['gte', 4, true],
    ['lt', 8, true],
    ['lte', 4, true],
    ['in', [4, 5], true],
    ['notIn', [3], true],
    ['isEmpty', undefined, false],
    ['isNotEmpty', undefined, true],
  ])('evaluates the %s operator without executing rule code', (operator, expected, required) => {
    const conditionalField = {
      ...fields[3],
      conditions: { requiredWhen: { field: 'amount', operator, ...(expected === undefined ? {} : { value: expected }) } },
    } as FormFieldDefinition;
    const result = validateFormResponses(
      [section],
      [fields[0], conditionalField],
      { amount: 4 },
      true,
    );
    expect(result.includes('details: is required')).toBe(required);
  });

  it('supports explicit block rules and rejects malformed scalar conditions', () => {
    const conditionField = {
      ...fields[3],
      conditions: { blockCompletionWhen: { field: 'enabled', operator: 'equals', value: true } },
    } as FormFieldDefinition;
    expect(validateFormResponses([section], [fields[2], conditionField], { enabled: true }, true))
      .toContain('details: blocks completion');
    expect(() => validateFormDefinition([section], [
      { ...fields[3], conditions: { visibleWhen: { field: 'enabled', operator: 'equals', value: { nested: true } } } },
    ])).toThrow(FormDomainError);
    expect(() => validateFormDefinition([section], [
      { ...fields[3], conditions: { visibleWhen: { field: 'enabled', operator: 'equals', value: true, code: 'bad' } } },
    ])).toThrow(FormDomainError);
    expect(() => validateFormDefinition([
      { ...section, conditions: { requiredWhen: { field: 'enabled', operator: 'equals', value: true } } },
    ], fields)).toThrow(FormDomainError);
  });

  it('validates PASS_FAIL, boolean, and multi-select response types', () => {
    expect(validateFormResponses([section], [fields[1]], { result: 'MAYBE' }, false))
      .toContain('result: must be PASS or FAIL');
    expect(validateFormResponses([section], [fields[2]], { enabled: 'true' as any }, false))
      .toContain('enabled: must be a boolean');
    expect(validateFormResponses([section], [
      { ...fields[2], key: 'choices', fieldType: 'MULTI_SELECT' } as FormFieldDefinition,
    ], { choices: [1] as any }, false)).toContain('choices: must be a list of strings');
  });
});

describe('FormTemplateService', () => {
  it('creates a template and audits the actor and new value', async () => {
    const createdTemplate = { id: 3, key: 'install', name: 'Install', createdById: 9 };
    const templateRepository = repository({ save: jest.fn().mockResolvedValue(createdTemplate) });
    const { dataSource, manager } = harness(repositoryMap([[FormTemplate, templateRepository]]));
    const service = new FormTemplateService(dataSource);

    await expect(service.createTemplate({
      key: 'install',
      name: 'Install',
      procedureType: 'FIELD_INSTALLATION' as any,
    }, 9)).resolves.toBe(createdTemplate);

    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_logs'), [
      'FORM_TEMPLATE_CREATED',
      9,
      expect.stringContaining('"newValue":{"key":"install","name":"Install"}'),
    ]);
  });

  it('creates an initial draft and refuses a second draft', async () => {
    const templateRepository = repository({
      findOne: jest.fn().mockResolvedValue({
        id: 3, name: 'Install', description: null, kind: 'FORM', procedureType: 'FIELD_INSTALLATION',
      }),
    });
    const versionRepository = repository({
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (value: any) => ({ id: 7, ...value })),
    });
    const { dataSource, manager } = harness(repositoryMap([
      [FormTemplate, templateRepository],
      [FormTemplateVersion, versionRepository],
    ]));
    const service = new FormTemplateService(dataSource);
    await expect(service.createDraft(3, 9)).resolves.toMatchObject({
      id: 7, templateId: 3, version: 1, status: FormVersionStatus.DRAFT,
    });

    versionRepository.find.mockResolvedValue([{ version: 1, status: FormVersionStatus.DRAFT }]);
    await expect(service.createDraft(3, 9)).rejects.toMatchObject({ code: 'DRAFT_ALREADY_EXISTS' });
    expect(manager.query).toHaveBeenCalledTimes(1);
  });

  it('rejects draft creation for a missing template', async () => {
    const templateRepository = repository({ findOne: jest.fn().mockResolvedValue(null) });
    const { dataSource } = harness(repositoryMap([[FormTemplate, templateRepository]]));
    await expect(new FormTemplateService(dataSource).createDraft(99, 9)).rejects.toMatchObject({
      code: 'TEMPLATE_NOT_FOUND',
    });
  });

  it('rejects attempts to edit an already published version', async () => {
    const versionRepository = repository({
      findOne: jest.fn().mockResolvedValue({ id: 7, status: FormVersionStatus.PUBLISHED }),
    });
    const { dataSource } = harness(repositoryMap([[FormTemplateVersion, versionRepository]]));
    const service = new FormTemplateService(dataSource);

    await expect(service.updateDraft(7, { title: 'Changed' }, 9)).rejects.toMatchObject({
      code: 'VERSION_NOT_DRAFT',
    });
  });

  it('publishes a valid draft and audits the status transition', async () => {
    const draft = { id: 7, templateId: 3, version: 1, status: FormVersionStatus.DRAFT, publishedAt: null };
    const versionRepository = repository({
      findOne: jest.fn().mockResolvedValue(draft),
      save: jest.fn(async (value: any) => value),
    });
    const sectionRepository = repository({ find: jest.fn().mockResolvedValue([section]) });
    const fieldRepository = repository({ find: jest.fn().mockResolvedValue(fields) });
    const { dataSource, manager } = harness(repositoryMap([
      [FormTemplateVersion, versionRepository],
      [FormSection, sectionRepository],
      [FormFieldDefinition, fieldRepository],
      [FormAssignmentRule, repository()],
    ]));
    const service = new FormTemplateService(dataSource);

    await expect(service.publishVersion(7, 9)).resolves.toMatchObject({
      status: FormVersionStatus.PUBLISHED,
      publishedAt: expect.any(Date),
    });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_logs'), expect.arrayContaining([
      'FORM_VERSION_PUBLISHED',
      9,
    ]));
  });

  it('rejects publishing a draft with unsupported definition data', async () => {
    const versionRepository = repository({
      findOne: jest.fn().mockResolvedValue({ id: 7, status: FormVersionStatus.DRAFT }),
    });
    const sectionRepository = repository({ find: jest.fn().mockResolvedValue([section]) });
    const fieldRepository = repository({ find: jest.fn().mockResolvedValue([
      { ...fields[0], fieldType: 'UNKNOWN' },
    ]) });
    const { dataSource } = harness(repositoryMap([
      [FormTemplateVersion, versionRepository],
      [FormSection, sectionRepository],
      [FormFieldDefinition, fieldRepository],
      [FormAssignmentRule, repository()],
    ]));
    await expect(new FormTemplateService(dataSource).publishVersion(7, 9)).rejects.toMatchObject({
      code: 'INVALID_DEFINITION',
    });
    expect(versionRepository.save).not.toHaveBeenCalled();
  });

  it('updates draft metadata and replaces the draft definition while auditing both snapshots', async () => {
    const draft = { id: 7, status: FormVersionStatus.DRAFT, title: 'Old title', settings: {} };
    const versionRepository = repository({
      findOne: jest.fn().mockResolvedValue(draft),
      save: jest.fn(async (value: any) => value),
    });
    const sectionRepository = repository({
      find: jest.fn().mockResolvedValue([section]),
      delete: jest.fn(),
      save: jest.fn(async (values: any[]) => values.map((value, index) => ({ id: 21 + index, ...value }))),
    });
    const fieldRepository = repository({
      find: jest.fn().mockResolvedValue([fields[0]]),
      delete: jest.fn(),
      save: jest.fn(async (values: any[]) => values),
    });
    const { dataSource, manager } = harness(repositoryMap([
      [FormTemplateVersion, versionRepository],
      [FormSection, sectionRepository],
      [FormFieldDefinition, fieldRepository],
      [FormAssignmentRule, repository()],
    ]));

    await expect(new FormTemplateService(dataSource).updateDraft(7, {
      title: 'New title',
      sections: [{ key: 'next', title: 'Next', fields: [{ key: 'answer', label: 'Answer', fieldType: 'TEXT' }] }],
    }, 9)).resolves.toMatchObject({ title: 'New title' });
    expect(sectionRepository.delete).toHaveBeenCalledWith({ templateVersionId: 7 });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_logs'), [
      'FORM_DRAFT_UPDATED',
      9,
      expect.stringContaining('"previousValue":{"sections"'),
    ]);
    expect(manager.getRepository(FormAssignmentRule).delete).not.toHaveBeenCalled();
  });

  it('copies a published version, its sections and fields into a new draft', async () => {
    const source = {
      id: 7, templateId: 3, version: 2, status: FormVersionStatus.PUBLISHED,
      title: 'Install', description: null, kind: 'FORM', procedureType: 'FIELD_INSTALLATION',
      settings: { region: 'north' },
    };
    const versionRepository = repository({
      findOne: jest.fn().mockResolvedValue(source),
      find: jest.fn().mockResolvedValue([source]),
      save: jest.fn(async (value: any) => ({ id: 8, ...value })),
    });
    const sourceSection = { ...section, id: 1 };
    const sectionRepository = repository({
      find: jest.fn().mockResolvedValue([sourceSection]),
      save: jest.fn(async (values: any[]) => values.map((value, index) => ({ id: 21 + index, ...value }))),
    });
    const fieldRepository = repository({
      find: jest.fn().mockResolvedValue([fields[0]]),
      save: jest.fn(async (values: any[]) => values),
    });
    const triggerRepository = repository({
      find: jest.fn().mockResolvedValue([{ id: 6, eventType: 'task.created', active: true, conditions: {} }]),
      save: jest.fn(async (values: any[]) => values.map((value, index) => ({ id: 31 + index, ...value }))),
    });
    const assignmentRepository = repository({
      find: jest.fn().mockResolvedValue([{
        triggerId: 6, priority: 1, active: true, conditions: {}, assignedUserId: 9, assignedTeamId: null,
      }, {
        triggerId: null, priority: 2, active: true, conditions: {}, assignedUserId: null, assignedTeamId: 4,
      }]),
      save: jest.fn(async (values: any[]) => values),
    });
    const templateRepository = repository({
      findOne: jest.fn().mockResolvedValue({ id: 3 }),
    });
    const { dataSource } = harness(repositoryMap([
      [FormTemplate, templateRepository],
      [FormTemplateVersion, versionRepository],
      [FormSection, sectionRepository],
      [FormFieldDefinition, fieldRepository],
      [FormTrigger, triggerRepository],
      [FormAssignmentRule, assignmentRepository],
    ]));

    await expect(new FormTemplateService(dataSource).createNextVersion(7, 9)).resolves.toMatchObject({
      id: 8,
      templateId: 3,
      version: 3,
      status: FormVersionStatus.DRAFT,
      settings: { region: 'north' },
    });
    expect(sectionRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ templateVersionId: 8, key: 'main' }),
    ]);
    expect(fieldRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ templateVersionId: 8, sectionId: 21, key: 'amount' }),
    ]);
    expect(assignmentRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ templateVersionId: 8, triggerId: 31, assignedUserId: 9 }),
      expect.objectContaining({ templateVersionId: 8, triggerId: null, assignedTeamId: 4 }),
    ]);
  });
});

describe('FormInstanceService', () => {
  const submittedValues = (result: string) => [{ fieldDefinitionId: 10, value: 4 }, { fieldDefinitionId: 11, value: result }];

  it('creates an instance on the requested older published version after a newer one exists', async () => {
    const publishedVersions = [
      { id: 7, status: FormVersionStatus.PUBLISHED },
      { id: 8, status: FormVersionStatus.PUBLISHED },
    ];
    const versionRepository = repository({
      findOne: jest.fn(({ where }: any) => Promise.resolve(publishedVersions.find(version => version.id === where.id))),
    });
    const instanceRepository = repository({
      create: jest.fn((value: any) => value),
      save: jest.fn(async (value: any) => ({ id: 20, ...value })),
    });
    const { dataSource } = harness(repositoryMap([
      [FormTemplateVersion, versionRepository],
      [FormInstance, instanceRepository],
    ]));

    await expect(new FormInstanceService(dataSource).createInstance({ templateVersionId: 7 }, 9)).resolves.toMatchObject({
      id: 20, templateVersionId: 7, status: FormInstanceStatus.DRAFT,
    });
    expect(instanceRepository.create).toHaveBeenCalledWith(expect.objectContaining({ templateVersionId: 7 }));
  });

  it('rejects a task that does not belong to the supplied contract and keeps traceability otherwise', async () => {
    const versionRepository = repository({ findOne: jest.fn().mockResolvedValue({ id: 7, status: FormVersionStatus.PUBLISHED }) });
    const taskRepository = repository({ findOne: jest.fn().mockResolvedValue({ id: 5, contractId: 2 }) });
    const instanceRepository = repository({ save: jest.fn(async (value: any) => ({ id: 20, ...value })) });
    const { dataSource } = harness(repositoryMap([
      [FormTemplateVersion, versionRepository], [Task, taskRepository], [FormInstance, instanceRepository],
    ]));
    const service = new FormInstanceService(dataSource);

    await expect(service.createInstance({ templateVersionId: 7, taskId: 5, contractId: 3 }, 9))
      .rejects.toMatchObject({ code: 'INVALID_INSTANCE_CONTEXT' });
    expect(instanceRepository.save).not.toHaveBeenCalled();
    await expect(service.createInstance({ templateVersionId: 7, taskId: 5, contractId: 2, deviceId: 4, assignedUserId: 1 }, 9))
      .resolves.toMatchObject({ taskId: 5, contractId: 2, deviceId: 4, assignedUserId: 1, templateVersionId: 7 });
  });

  it('validates submitted answer values against stored definitions before saving', async () => {
    const instance = { id: 20, templateVersionId: 7, status: FormInstanceStatus.DRAFT };
    const instanceRepository = repository({ findOne: jest.fn().mockResolvedValue(instance) });
    const sectionRepository = repository({ find: jest.fn().mockResolvedValue([section]) });
    const fieldRepository = repository({ find: jest.fn().mockResolvedValue(fields) });
    const valueRepository = repository({ find: jest.fn().mockResolvedValue([]) });
    const { dataSource } = harness(repositoryMap([
      [FormInstance, instanceRepository],
      [FormSection, sectionRepository],
      [FormFieldDefinition, fieldRepository],
      [FormFieldValue, valueRepository],
    ]));

    await expect(new FormInstanceService(dataSource).saveResponses(20, { amount: 1 }, 9)).rejects.toMatchObject({
      code: 'INVALID_RESPONSES',
      details: { errors: expect.arrayContaining(['amount: must be at least 3']) },
    });
    expect(valueRepository.save).not.toHaveBeenCalled();
  });

  it('saves valid response updates and transitions a draft to in-progress', async () => {
    const instance = { id: 20, templateVersionId: 7, status: FormInstanceStatus.DRAFT };
    const instanceRepository = repository({
      findOne: jest.fn().mockResolvedValue(instance),
      save: jest.fn(async (value: any) => value),
    });
    const sectionRepository = repository({ find: jest.fn().mockResolvedValue([section]) });
    const fieldRepository = repository({ find: jest.fn().mockResolvedValue(fields) });
    const valueRepository = repository({
      find: jest.fn().mockResolvedValue([{ id: 30, fieldDefinitionId: 10, value: 4 }]),
      save: jest.fn(async (values: any[]) => values),
    });
    const { dataSource, manager } = harness(repositoryMap([
      [FormInstance, instanceRepository],
      [FormSection, sectionRepository],
      [FormFieldDefinition, fieldRepository],
      [FormFieldValue, valueRepository],
    ]));

    await expect(new FormInstanceService(dataSource).saveResponses(20, { amount: 4, result: 'PASS' }, 9))
      .resolves.toHaveLength(2);
    expect(instance.status).toBe(FormInstanceStatus.IN_PROGRESS);
    expect(valueRepository.save).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 30, updatedById: 9, value: 4 }),
      expect.objectContaining({ fieldDefinitionId: 11, value: 'PASS' }),
    ]));
    expect(manager.query).toHaveBeenCalled();
  });

  it('rejects response edits after submission and validation for a missing instance', async () => {
    const instanceRepository = repository({
      findOne: jest.fn().mockResolvedValue({ id: 20, status: FormInstanceStatus.SUBMITTED }),
    });
    const { dataSource } = harness(repositoryMap([[FormInstance, instanceRepository]]));
    const service = new FormInstanceService(dataSource);
    await expect(service.saveResponses(20, {}, 9)).rejects.toMatchObject({ code: 'INVALID_INSTANCE_STATUS' });
    instanceRepository.findOne.mockResolvedValue(null);
    await expect(service.validateResponses(20)).rejects.toMatchObject({ code: 'INSTANCE_NOT_FOUND' });
  });

  it('blocks completion for FAIL answers and required values, and submits valid answers', async () => {
    const instance = { id: 20, templateVersionId: 7, status: FormInstanceStatus.IN_PROGRESS, submittedAt: null };
    const instanceRepository = repository({
      findOne: jest.fn().mockResolvedValue(instance),
      save: jest.fn(async (value: any) => value),
    });
    const sectionRepository = repository({ find: jest.fn().mockResolvedValue([section]) });
    const fieldRepository = repository({ find: jest.fn().mockResolvedValue(fields) });
    const valueRepository = repository({ find: jest.fn().mockResolvedValue(submittedValues('FAIL')) });
    const { dataSource } = harness(repositoryMap([
      [FormInstance, instanceRepository],
      [FormSection, sectionRepository],
      [FormFieldDefinition, fieldRepository],
      [FormFieldValue, valueRepository],
    ]));
    const service = new FormInstanceService(dataSource);

    await expect(service.complete(20, 9)).rejects.toMatchObject({
      code: 'INVALID_RESPONSES',
      details: { errors: expect.arrayContaining(['result: FAIL blocks completion']) },
    });
    valueRepository.find.mockResolvedValue(submittedValues('PASS'));
    await expect(service.complete(20, 9)).resolves.toMatchObject({ status: FormInstanceStatus.SUBMITTED });
  });

  it('reports missing required values during validation', async () => {
    const instanceRepository = repository({ findOne: jest.fn().mockResolvedValue({ id: 20, templateVersionId: 7 }) });
    const sectionRepository = repository({ find: jest.fn().mockResolvedValue([section]) });
    const fieldRepository = repository({ find: jest.fn().mockResolvedValue(fields) });
    const valueRepository = repository({ find: jest.fn().mockResolvedValue([]) });
    const { dataSource } = harness(repositoryMap([
      [FormInstance, instanceRepository],
      [FormSection, sectionRepository],
      [FormFieldDefinition, fieldRepository],
      [FormFieldValue, valueRepository],
    ]));

    await expect(new FormInstanceService(dataSource).validateResponses(20)).resolves.toContain('amount: is required');
  });

  it('rejects creating an instance from an unpublished version', async () => {
    const versionRepository = repository({ findOne: jest.fn().mockResolvedValue({ id: 7, status: FormVersionStatus.DRAFT }) });
    const { dataSource } = harness(repositoryMap([[FormTemplateVersion, versionRepository]]));
    await expect(new FormInstanceService(dataSource).createInstance({ templateVersionId: 7 }, 9)).rejects.toMatchObject({
      code: 'VERSION_NOT_PUBLISHED',
    });
  });
});

describe('FormApprovalService', () => {
  it('requires a rejection comment', async () => {
    const { dataSource } = harness(repositoryMap([]));
    await expect(new FormApprovalService(dataSource).reject(20, 9, '  ')).rejects.toMatchObject({
      code: 'REJECTION_COMMENT_REQUIRED',
    });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('records an approval and transitions a submitted instance', async () => {
    const instance = { id: 20, status: FormInstanceStatus.SUBMITTED };
    const instanceRepository = repository({
      findOne: jest.fn().mockResolvedValue(instance),
      save: jest.fn(async (value: any) => value),
    });
    const approvalRepository = repository({
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (value: any) => ({ id: 40, ...value })),
    });
    const { dataSource, manager } = harness(repositoryMap([
      [FormInstance, instanceRepository],
      [FormApproval, approvalRepository],
    ]));

    await expect(new FormApprovalService(dataSource).approve(20, 9)).resolves.toMatchObject({
      id: 40,
      decision: FormApprovalDecision.APPROVED,
      round: 1,
    });
    expect(instance.status).toBe(FormInstanceStatus.APPROVED);
    expect(manager.query).toHaveBeenCalled();
  });

  it('rejects a submitted instance with a trimmed comment', async () => {
    const instance = { id: 20, status: FormInstanceStatus.SUBMITTED };
    const instanceRepository = repository({
      findOne: jest.fn().mockResolvedValue(instance),
      save: jest.fn(async (value: any) => value),
    });
    const approvalRepository = repository({
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (value: any) => value),
    });
    const { dataSource } = harness(repositoryMap([
      [FormInstance, instanceRepository],
      [FormApproval, approvalRepository],
    ]));

    await expect(new FormApprovalService(dataSource).reject(20, 9, '  Needs changes  ')).resolves.toMatchObject({
      decision: FormApprovalDecision.REJECTED,
      comment: 'Needs changes',
    });
    expect(instance.status).toBe(FormInstanceStatus.REJECTED);
  });
});

describe('FormRules stage 8: composite conditions, variable references, assignment', () => {
  const when = (conditions: unknown) => evaluateFormCondition({ visibleWhen: conditions }, 'visibleWhen', { a: 1, b: 2, c: 2 });

  it('evaluates all/any/not groups and ${form.key} references', () => {
    expect(when({ all: [{ field: 'a', operator: 'equals', value: 1 }, { field: 'b', operator: 'gt', value: 1 }] })).toBe(true);
    expect(when({ any: [{ field: 'a', operator: 'equals', value: 9 }, { field: 'b', operator: 'equals', value: 2 }] })).toBe(true);
    expect(when({ not: { field: 'a', operator: 'equals', value: 1 } })).toBe(false);
    expect(when({ field: 'b', operator: 'equals', value: '${form.c}' })).toBe(true);
    expect(when({ field: 'a', operator: 'equals', value: '${form.c}' })).toBe(false);
  });

  it('rejects unsafe or malformed conditions at definition time', () => {
    const build = (condition: unknown) => validateFormDefinition([section], [
      { ...fields[0], conditions: { visibleWhen: condition } } as FormFieldDefinition,
      { ...fields[1] } as FormFieldDefinition,
    ]);
    const key = fields[1].key;
    expect(() => build({ field: key, operator: 'equals', value: `\${form.${key}}` })).not.toThrow();
    for (const bad of [
      { field: key, operator: 'equals', value: '${camera.total}' },
      { field: key, operator: 'equals', value: '${form.missing}' },
      { field: key, operator: 'equals', value: 'x ${form.' + key + '}' },
      { all: [] },
      { all: [{ field: key, operator: 'isEmpty' }], any: [] },
      { not: { not: { not: { not: { field: key, operator: 'isEmpty' } } } } },
    ]) {
      expect(() => build(bad)).toThrow(FormDomainError);
    }
  });

  it('resolves assignment by priority and active flag', () => {
    const rules = [
      { id: 1, priority: 5, active: true, conditions: {}, assignedUserId: 1, assignedTeamId: null },
      { id: 2, priority: 1, active: true, conditions: { when: { field: 'a', operator: 'equals', value: 1 } }, assignedUserId: 2, assignedTeamId: null },
      { id: 3, priority: 0, active: false, conditions: {}, assignedUserId: 3, assignedTeamId: null },
    ];
    expect(resolveAssignment(rules, { a: 1 })?.id).toBe(2);
    expect(resolveAssignment(rules, { a: 2 })?.id).toBe(1);
    expect(resolveAssignment([], {})).toBeNull();
  });

  it('forbids installedIn in DEVICE_PRECONFIGURATION', () => {
    expect(() => assertRelationAllowed('DEVICE_PRECONFIGURATION', 'installedIn')).toThrow(FormDomainError);
    expect(() => assertRelationAllowed('FIELD_INSTALLATION', 'installedIn')).not.toThrow();
  });
});

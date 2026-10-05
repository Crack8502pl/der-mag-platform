import { FormAssignmentRule } from '../../../src/entities/FormAssignmentRule';
import { FormFieldDefinition } from '../../../src/entities/FormFieldDefinition';
import { FormTemplateVersion } from '../../../src/entities/FormTemplateVersion';
import { FormTrigger } from '../../../src/entities/FormTrigger';
import { FormSection } from '../../../src/entities/FormSection';
import { FormTemplateService } from '../../../src/services/FormTemplateService';
import { FormAuditService } from '../../../src/services/FormAuditService';
import { RESERVED_FORM_KEYS } from '../../../src/utils/formJson';

jest.mock('../../../src/config/database', () => ({ AppDataSource: {} }));

describe('FormTemplateService.replaceAssignmentRules', () => {
  let service: FormTemplateService;
  let manager: any;
  let versions: any;
  let rules: any;
  let fields: any;
  let triggers: any;
  let audit: jest.SpyInstance;

  beforeEach(() => {
    versions = { findOne: jest.fn().mockResolvedValue({ id: 1, status: 'DRAFT' }) };
    rules = {
      find: jest.fn().mockResolvedValue([{ id: 20, templateVersionId: 1, assignedUserId: 2 }]),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn(input => input),
      save: jest.fn(async input => input.map((rule: any, index: number) => ({ ...rule, id: index + 30 }))),
    };
    fields = { find: jest.fn().mockResolvedValue([{ key: 'result' }]) };
    triggers = { find: jest.fn().mockResolvedValue([{ id: 5 }]) };
    const repositories = new Map<unknown, any>([
      [FormTemplateVersion, versions], [FormAssignmentRule, rules], [FormFieldDefinition, fields], [FormTrigger, triggers],
    ]);
    manager = { getRepository: jest.fn(entity => repositories.get(entity)), query: jest.fn().mockResolvedValue(undefined) };
    service = new FormTemplateService({ transaction: jest.fn(callback => callback(manager)) } as any);
    audit = jest.spyOn(FormAuditService, 'record');
  });

  afterEach(() => jest.restoreAllMocks());

  it('locks the same draft and replaces only its rules with explicit defaults, recording snapshots and actor in the same transaction', async () => {
    const result = await service.replaceAssignmentRules(1, [{ assignedUserId: 7 }], 9);
    expect(versions.findOne).toHaveBeenCalledWith({ where: { id: 1 }, lock: { mode: 'pessimistic_write' } });
    expect(fields.find).toHaveBeenCalledWith({ where: { templateVersionId: 1 } });
    expect(triggers.find).toHaveBeenCalledWith({ where: { templateVersionId: 1 } });
    expect(rules.delete).toHaveBeenCalledWith({ templateVersionId: 1 });
    expect(result).toEqual([{
      id: 30, templateVersionId: 1, triggerId: null, assignedUserId: 7, assignedTeamId: null,
      priority: 0, active: true, conditions: {},
    }]);
    expect(audit).toHaveBeenCalledWith(manager, 'FORM_ASSIGNMENT_RULES_UPDATED', 9, 'form_template_version', 1, [{
      field: 'assignmentRules',
      previousValue: [{ id: 20, templateVersionId: 1, assignedUserId: 2 }],
      newValue: result,
    }]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_logs'), expect.arrayContaining(['FORM_ASSIGNMENT_RULES_UPDATED', 9]));
  });

  it('accepts same-version trigger and declarative persisted-field condition with both assignment targets', async () => {
    const input = {
      assignedUserId: 7, assignedTeamId: 8, triggerId: 5, priority: 3, active: false,
      conditions: { visibleWhen: { field: 'result', operator: 'equals', value: 'FAIL' } },
    };
    expect(await service.replaceAssignmentRules(1, [input], 9)).toEqual([{ id: 30, templateVersionId: 1, ...input }]);
  });

  it('accepts a brigade-only target and clears the list transactionally', async () => {
    const [rule] = await service.replaceAssignmentRules(1, [{ assignedTeamId: 8 }], 9);
    expect(rule.assignedUserId).toBeNull();
    rules.save.mockClear();
    expect(await service.replaceAssignmentRules(1, [], 9)).toEqual([]);
    expect(rules.save).not.toHaveBeenCalled();
    expect(audit).toHaveBeenLastCalledWith(manager, 'FORM_ASSIGNMENT_RULES_UPDATED', 9, 'form_template_version', 1, [
      expect.objectContaining({ newValue: [] }),
    ]);
  });

  it('accepts an explicit null trigger and persists a triggerless rule', async () => {
    expect(await service.replaceAssignmentRules(1, [{ assignedUserId: 7, triggerId: null }], 9))
      .toEqual([expect.objectContaining({ templateVersionId: 1, assignedUserId: 7, triggerId: null })]);
    expect(audit).toHaveBeenCalled();
  });

  it.each(RESERVED_FORM_KEYS)('rejects reserved scalar draft field/section key %s before definition writes', async key => {
    await expect(service.updateDraft(1, { sections: [{
      key: 'main', title: 'Main', fields: [{ key, label: 'Reserved', fieldType: 'TEXT' }],
    }] }, 9)).rejects.toMatchObject({ code: 'INVALID_DEFINITION' });
    await expect(service.updateDraft(1, { sections: [{ key, title: 'Reserved', fields: [] }] }, 9))
      .rejects.toMatchObject({ code: 'INVALID_DEFINITION' });
    expect(audit).not.toHaveBeenCalled();
  });

  it.each([
    [{}],
    [{ assignedUserId: 7, triggerId: 99 }],
    [{ assignedUserId: 7, conditions: { visibleWhen: { field: 'another_version_field', operator: 'equals', value: true } } }],
    [{ assignedUserId: 7, conditions: { visibleWhen: { field: 'result', operator: 'eval', value: 'process.exit()' } } }],
    [{ assignedUserId: 7, conditions: { execute: 'arbitrary code' } }],
  ])('rejects invalid target/foreign trigger/unsafe conditions before deleting existing rules (%j)', async input => {
    await expect(service.replaceAssignmentRules(1, [input as any], 9)).rejects.toMatchObject({ code: 'INVALID_DEFINITION' });
    expect(rules.delete).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it.each([
    [null, 'VERSION_NOT_FOUND'],
    [{ id: 1, status: 'PUBLISHED' }, 'VERSION_NOT_DRAFT'],
  ])('refuses a missing or immutable version before changing assignments (%j)', async (version, code) => {
    versions.findOne.mockResolvedValue(version);
    await expect(service.replaceAssignmentRules(1, [{ assignedUserId: 7 }], 9)).rejects.toMatchObject({ code });
    expect(rules.delete).not.toHaveBeenCalled();
  });

  it('propagates DB errors so the transaction rolls back and does not audit failed replacement', async () => {
    const error = new Error('foreign key failure');
    rules.save.mockRejectedValue(error);
    await expect(service.replaceAssignmentRules(1, [{ assignedUserId: 7 }], 9)).rejects.toBe(error);
    expect(audit).not.toHaveBeenCalled();
  });

  it('propagates audit failure from inside the same transaction', async () => {
    const error = new Error('audit failure');
    manager.query.mockRejectedValue(error);
    await expect(service.replaceAssignmentRules(1, [{ assignedUserId: 7 }], 9)).rejects.toBe(error);
    expect(rules.save).toHaveBeenCalled();
  });

  it('rejects publishing when a draft edit removed a persisted assignment-condition field', async () => {
    const sections = { find: jest.fn().mockResolvedValue([]) };
    fields.find.mockResolvedValue([]);
    rules.find.mockResolvedValue([{
      conditions: { visibleWhen: { field: 'removed', operator: 'equals', value: true } },
    }]);
    const original = manager.getRepository.getMockImplementation();
    manager.getRepository.mockImplementation((entity: unknown) => entity === FormSection ? sections : original(entity));
    await expect(service.publishVersion(1, 9)).rejects.toMatchObject({ code: 'INVALID_DEFINITION' });
    expect(audit).not.toHaveBeenCalled();
  });

  it('validates persisted assignment references again at publication', async () => {
    const sections = { find: jest.fn().mockResolvedValue([{ id: 2, conditions: {} }]) };
    fields.find.mockResolvedValue([{ id: 3, sectionId: 2, key: 'result', fieldType: 'TEXT', conditions: {}, validation: {} }]);
    rules.find.mockResolvedValue([{
      conditions: { visibleWhen: { field: 'result', operator: 'equals', value: 'OK' } },
    }]);
    versions.save = jest.fn(async (version: unknown) => version);
    const original = manager.getRepository.getMockImplementation();
    manager.getRepository.mockImplementation((entity: unknown) => entity === FormSection ? sections : original(entity));
    await expect(service.publishVersion(1, 9)).resolves.toMatchObject({ status: 'PUBLISHED' });
    expect(audit).toHaveBeenCalledWith(manager, 'FORM_VERSION_PUBLISHED', 9, 'form_template_version', 1,
      expect.any(Array), expect.any(Object));
  });
});

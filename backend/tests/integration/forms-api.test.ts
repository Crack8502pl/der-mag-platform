import express from 'express';
import request from 'supertest';
import { QueryFailedError } from 'typeorm';
import { AppDataSource } from '../../src/config/database';
import { verifyAccessToken } from '../../src/config/jwt';
import { User } from '../../src/entities/User';
import { FormTemplate } from '../../src/entities/FormTemplate';
import { FormTemplateVersion } from '../../src/entities/FormTemplateVersion';
import { FormSection } from '../../src/entities/FormSection';
import { FormFieldDefinition } from '../../src/entities/FormFieldDefinition';
import { FormAssignmentRule } from '../../src/entities/FormAssignmentRule';
import { FormTrigger } from '../../src/entities/FormTrigger';
import { FormInstance } from '../../src/entities/FormInstance';
import { FormFieldValue } from '../../src/entities/FormFieldValue';
import { FormDomainError, FormDomainErrorCode } from '../../src/errors/FormDomainError';
import { FormTemplateService } from '../../src/services/FormTemplateService';
import { FormInstanceService } from '../../src/services/FormInstanceService';
import { FormApprovalService } from '../../src/services/FormApprovalService';
import { errorHandler } from '../../src/middleware/errorHandler';
import formsRoutes from '../../src/routes/forms.routes';
import { RESERVED_FORM_KEYS } from '../../src/utils/formJson';

jest.mock('../../src/config/database', () => ({ AppDataSource: { getRepository: jest.fn(), transaction: jest.fn() } }));
jest.mock('../../src/config/jwt', () => ({ verifyAccessToken: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ serverLogger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('../../src/utils/securityLogger', () => ({ logSecurityEvent: jest.fn() }));

const templateBody = { key: 'installation', name: 'Installation', procedureType: 'FIELD_INSTALLATION' };
const draftBody = {
  title: 'Updated', description: null, settings: {},
  sections: [{
    key: 'main', title: 'Main', description: 'Section', sortOrder: 1, conditions: {},
    fields: [{
      key: 'result', label: 'Result', fieldType: 'PASS_FAIL', required: true, sortOrder: 1,
      validation: {}, options: {}, conditions: {},
    }],
  }],
};
const allActions = { read: true, create: true, update: true, publish: true, complete: true, approve: true, assign: true };
let grants: any;
let userExists: boolean;
let records: any[];
let memberships: any[];
let query: any;
let repositories: Map<unknown, any>;
const realCreateInstance = FormInstanceService.prototype.createInstance;
const realSaveResponses = FormInstanceService.prototype.saveResponses;
const realComplete = FormInstanceService.prototype.complete;

const services = {
  createTemplate: jest.spyOn(FormTemplateService.prototype, 'createTemplate'),
  createDraft: jest.spyOn(FormTemplateService.prototype, 'createDraft'),
  updateDraft: jest.spyOn(FormTemplateService.prototype, 'updateDraft'),
  publish: jest.spyOn(FormTemplateService.prototype, 'publishVersion'),
  next: jest.spyOn(FormTemplateService.prototype, 'createNextVersion'),
  assign: jest.spyOn(FormTemplateService.prototype, 'replaceAssignmentRules'),
  createInstance: jest.spyOn(FormInstanceService.prototype, 'createInstance'),
  assignInstance: jest.spyOn(FormInstanceService.prototype, 'assignInstance'),
  values: jest.spyOn(FormInstanceService.prototype, 'saveResponses'),
  complete: jest.spyOn(FormInstanceService.prototype, 'complete'),
  approve: jest.spyOn(FormApprovalService.prototype, 'approve'),
  reject: jest.spyOn(FormApprovalService.prototype, 'reject'),
};

const app = express();
app.use(express.json({ strict: false }));
app.use('/api/forms', formsRoutes);
app.use(errorHandler);

function call(method: string, path: string, body?: unknown, token: string | null = 'valid') {
  const operation = (request(app) as any)[method](`/api/forms${path}`);
  if (token !== null) operation.set('Authorization', ['Bearer', token].join(' '));
  if (body !== undefined) operation.send(body);
  return operation;
}

const endpoints: [string, string, unknown, number, string][] = [
  ['get', '/templates', undefined, 200, 'read'],
  ['post', '/templates', templateBody, 201, 'create'],
  ['get', '/templates/1', undefined, 200, 'read'],
  ['get', '/templates/1/versions', undefined, 200, 'read'],
  ['post', '/templates/1/draft', {}, 201, 'create'],
  ['get', '/versions/1', undefined, 200, 'read'],
  ['put', '/versions/1/draft', draftBody, 200, 'update'],
  ['post', '/versions/1/publish', {}, 200, 'publish'],
  ['post', '/versions/1/next', {}, 201, 'create'],
  ['get', '/versions/1/assignment-rules', undefined, 200, 'read'],
  ['put', '/versions/1/assignment-rules', { rules: [{ assignedUserId: 9 }] }, 200, 'assign'],
  ['get', '/instances', undefined, 200, 'read'],
  ['post', '/instances', { templateVersionId: 1 }, 201, 'create'],
  ['get', '/instances/1', undefined, 200, 'read'],
  ['put', '/instances/1/assignment', { assignedUserId: 9 }, 200, 'assign'],
  ['get', '/instances/1/values', undefined, 200, 'read'],
  ['put', '/instances/1/values', { responses: { result: 'PASS' } }, 200, 'update'],
  ['post', '/instances/1/complete', {}, 200, 'complete'],
  ['post', '/instances/1/approve', { comment: ' Approved ' }, 200, 'approve'],
  ['post', '/instances/1/reject', { comment: ' Rework ' }, 200, 'approve'],
];

beforeEach(() => {
  process.env.NODE_ENV = 'production';
  process.env.PARANOID_MODE = 'false';
  grants = { forms: { ...allActions } };
  userExists = true;
  records = [{ id: 1, templateVersionId: 1, createdById: 7, assignedUserId: null, assignedTeamId: null }];
  memberships = [];
  (verifyAccessToken as jest.Mock).mockImplementation((token: string) => {
    if (token !== 'valid') throw new Error('Invalid token');
    return { userId: 7 };
  });
  for (const spy of Object.values(services)) {
    spy.mockReset();
    (spy as jest.Mock).mockResolvedValue({ id: 1 });
  }
  services.values.mockImplementation(async (id, _responses, _actor, guard) => {
    await guard?.({ getRepository: AppDataSource.getRepository } as any, { id } as FormInstance);
    return [];
  });
  services.complete.mockImplementation(async (id, _actor, guard) => {
    await guard?.({ getRepository: AppDataSource.getRepository } as any, { id } as FormInstance);
    return { id } as FormInstance;
  });
  const predicates: [string, any][] = [];
  const matching = () => {
    const scoped = predicates.some(([sql]) => sql.includes('EXISTS'));
    const id = predicates.find(([sql]) => sql === 'instance.id = :id')?.[1].id;
    const today = new Date().toISOString().slice(0, 10);
    return records.filter(item => (id === undefined || item.id === id) && (!scoped
      || item.createdById === 7 || item.assignedUserId === 7
      || memberships.some(member => member.brigadeId === item.assignedTeamId && member.userId === 7
        && member.active && member.validFrom <= today && (member.validTo === null || member.validTo >= today))));
  };
  query = {
    andWhere: jest.fn((sql: string, params: any) => { predicates.push([sql, params]); return query; }),
    orderBy: jest.fn(() => query), skip: jest.fn(() => query), take: jest.fn(() => query),
    getOne: jest.fn(async () => matching()[0] ?? null),
    getManyAndCount: jest.fn(async () => [matching(), matching().length]),
  };
  const repository = (item: any) => ({
    findOne: jest.fn().mockResolvedValue(item),
    find: jest.fn().mockResolvedValue([item]),
    findAndCount: jest.fn().mockResolvedValue([[item], 1]),
    save: jest.fn().mockResolvedValue(item),
  });
  repositories = new Map<unknown, any>([
    [User, { findOne: jest.fn(async () => userExists ? { role: { permissions: grants } } : null) }],
    [FormTemplate, repository({ id: 1, name: 'Template', createdById: 7 })],
    [FormTemplateVersion, repository({ id: 1, templateId: 1, version: 1 })],
    [FormSection, repository({ id: 1, templateVersionId: 1 })],
    [FormFieldDefinition, repository({ id: 1, templateVersionId: 1, key: 'result' })],
    [FormTrigger, repository({ id: 1, templateVersionId: 1 })],
    [FormAssignmentRule, repository({ id: 1, templateVersionId: 1, assignedUserId: 9 })],
    [FormFieldValue, repository({ id: 1, instanceId: 1, value: 'PASS', updatedById: 7 })],
    [FormInstance, { createQueryBuilder: jest.fn(() => query), findOne: jest.fn(), save: jest.fn() }],
  ]);
  (AppDataSource.getRepository as jest.Mock).mockImplementation(entity => repositories.get(entity));
});

afterAll(() => {
  process.env.NODE_ENV = 'test';
  delete process.env.PARANOID_MODE;
  jest.restoreAllMocks();
});

describe('Forms REST API', () => {
  it.each(endpoints)('%s %s succeeds with its action grant', async (method, path, body, status) => {
    const response = await call(method, path, body);
    expect(response.status).toBe(status);
    expect(response.body).toMatchObject({ success: true, message: 'OK' });
    expect(response.body.data).toBeDefined();
  });

  it.each(endpoints)('%s %s authenticates and denies its missing action', async (method, path, body, _status, action) => {
    expect((await call(method, path, body, null)).status).toBe(401);
    expect((await call(method, path, body, 'bad')).status).toBe(401);
    grants.forms[action] = false;
    expect((await call(method, path, body)).status).toBe(403);
  });

  it('denies absent module/role/user and accepts existing all permission without a role-name bypass', async () => {
    grants = {};
    expect((await call('get', '/templates')).body.code).toBe('MODULE_ACCESS_DENIED');
    grants = { all: true };
    expect((await call('get', '/templates')).status).toBe(200);
    userExists = false;
    expect((await call('get', '/templates')).status).toBe(401);
  });

  it.each(['0', '-1', '1.5', '1e2', '01', '2147483648', 'x', '1%20', '1%20OR%201=1'])('rejects strict int32 ID %s', async id => {
    for (const path of [`/templates/${id}`, `/versions/${id}`, `/instances/${id}`]) {
      expect((await call('get', path)).status).toBe(400);
    }
  });

  it.each(['page=0', 'page=-1', 'page=1.5', 'page=1e2', 'page=01', 'page=1000001',
    'limit=101', 'limit=0', 'page[]=1', 'page=1&page=2', 'sort=id', 'limit=2147483648'])('rejects query %s', async queryString => {
    expect((await call('get', `/templates?${queryString}`)).status).toBe(400);
    expect((await call('get', `/instances?${queryString}`)).status).toBe(400);
  });

  it('uses validated bounded pagination and rejects query fields on non-list endpoints', async () => {
    const response = await call('get', '/templates?page=2&limit=100');
    expect(response.body.data).toMatchObject({ page: 2, limit: 100, total: 1 });
    expect(repositories.get(FormTemplate).findAndCount).toHaveBeenCalledWith({ order: { id: 'DESC' }, skip: 100, take: 100 });
    expect((await call('get', '/versions/1?limit=1')).status).toBe(400);
    expect((await call('get', '/templates/2147483647')).status).toBe(200);
    expect((await call('get', '/instances?page=2&limit=10')).status).toBe(200);
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.take).toHaveBeenCalledWith(10);
  });

  it.each([
    ['post', '/templates', { ...templateBody, kind: 'BAD' }],
    ['post', '/templates', { ...templateBody, name: '  ' }],
    ['post', '/templates', { ...templateBody, procedureType: 'BAD' }],
    ['post', '/templates', { ...templateBody, createdById: 99 }],
    ['post', '/templates', { ...templateBody, kind: null }],
    ['put', '/versions/1/draft', { title: null }],
    ['put', '/versions/1/draft', { settings: null }],
    ['put', '/versions/1/draft', { sections: null }],
    ['put', '/versions/1/draft', { sections: [{ key: 'x', title: 'X', fields: [{ key: 'x', label: 'X', fieldType: 'BAD' }] }] }],
    ['put', '/versions/1/draft', { sections: [{ key: 'x', title: 'X', createdById: 99, fields: [] }] }],
    ['put', '/versions/1/draft', { sections: [{ key: 'x', title: 'X', fields: [{ key: 'x', label: 'X', fieldType: 'TEXT', required: null }] }] }],
    ['put', '/versions/1/draft', { sections: [{ key: 'x', title: 'X', fields: [{ key: 'x', label: 'X', fieldType: 'TEXT', id: 99 }] }] }],
    ['post', '/instances', { templateVersionId: '1' }],
    ['post', '/instances', { templateVersionId: 0 }],
    ['post', '/instances', { templateVersionId: 2147483648 }],
    ['post', '/instances', { templateVersionId: 1, assignedUserId: null }],
    ['post', '/instances', { templateVersionId: 1, definition: {} }],
    ['post', '/instances', { templateVersionId: 1, status: 'APPROVED', createdById: 99 }],
    ['put', '/instances/1/assignment', { assignedUserId: '1' }],
    ['put', '/instances/1/assignment', { assignedTeamId: 0 }],
    ['put', '/instances/1/assignment', { assignedUserId: 2147483648 }],
    ['put', '/instances/1/assignment', { assignedUserId: 9, creatorId: 99 }],
    ['put', '/instances/1/assignment', { assignedUserId: 9, status: 'APPROVED' }],
    ['put', '/instances/1/assignment', { assignedUserId: 9, templateVersionId: 99 }],
    ['put', '/instances/1/assignment', { assignedUserId: 9, definition: {} }],
    ['put', '/instances/1/values', { responses: null }],
    ['put', '/instances/1/values', { responses: [] }],
    ['put', '/instances/1/values', { responses: {}, definition: {} }],
    ['post', '/instances/1/complete', { definition: {} }],
    ['post', '/instances/1/approve', { comment: null }],
    ['post', '/instances/1/approve', { comment: 'ok', decidedById: 99 }],
    ['post', '/instances/1/reject', { comment: '   ' }],
    ['post', '/instances/1/reject', {}],
    ['post', '/instances/1/reject', { comment: 'ok', definition: {} }],
    ['post', '/versions/1/publish', { status: 'PUBLISHED' }],
    ['post', '/versions/1/next', { actorId: 99 }],
    ['post', '/templates/1/draft', { sections: [] }],
    ['post', '/templates/1/draft', { _empty: null }],
    ['put', '/versions/1/assignment-rules', { rules: [{ assignedUserId: '7' }] }],
    ['put', '/versions/1/assignment-rules', { rules: [{ assignedUserId: 7, templateVersionId: 2 }] }],
    ['put', '/versions/1/assignment-rules', { rules: null }],
    ['post', '/templates', []],
    ['post', '/templates', 'string'],
  ])('rejects invalid/unknown body for %s %s (%j)', async (method, path, body) => {
    expect((await call(method as string, path as string, body)).status).toBe(400);
  });

  it('delegates lifecycle and persisted-definition validation with authenticated actor only', async () => {
    await call('post', '/templates', templateBody);
    expect(services.createTemplate).toHaveBeenCalledWith(expect.objectContaining(templateBody), 7);
    await call('put', '/versions/1/draft', draftBody);
    expect(services.updateDraft).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'Updated', sections: draftBody.sections }), 7);
    await call('post', '/templates/1/draft', {});
    expect(services.createDraft).toHaveBeenCalledWith(1, 7);
    await call('post', '/versions/1/publish', {});
    expect(services.publish).toHaveBeenCalledWith(1, 7);
    await call('post', '/versions/1/next', {});
    expect(services.next).toHaveBeenCalledWith(1, 7);
    await call('put', '/instances/1/values', { responses: { result: 'PASS', notes: { nested: [true, null, 42] } } });
    expect(services.values).toHaveBeenCalledWith(1, { result: 'PASS', notes: { nested: [true, null, 42] } }, 7, expect.any(Function));
    await call('post', '/instances/1/complete', {});
    expect(services.complete).toHaveBeenCalledWith(1, 7, expect.any(Function));
    await call('post', '/instances/1/approve', {});
    expect(services.approve).toHaveBeenCalledWith(1, 7, undefined);
    await call('post', '/instances/1/reject', { comment: ' Rework ' });
    expect(services.reject).toHaveBeenCalledWith(1, 7, 'Rework');
    await call('put', '/instances/99/assignment', { assignedUserId: null, assignedTeamId: 9 });
    expect(services.assignInstance).toHaveBeenCalledWith(99, { assignedUserId: null, assignedTeamId: 9 }, 7);
  });

  it('validates all nullable/non-nullable optional DTO properties at runtime', async () => {
    expect((await call('post', '/templates', { ...templateBody, kind: 'CHECKLIST', description: null })).status).toBe(201);
    expect((await call('post', '/templates', { ...templateBody, description: 'Description' })).status).toBe(201);
    expect((await call('put', '/versions/1/draft', {})).status).toBe(200);
    const section = { key: 'main', title: 'Main', fields: [] };
    expect((await call('put', '/versions/1/draft', { description: 'Description', sections: [{ ...section, description: null }] })).status).toBe(200);
    const completeRule = { triggerId: 1, priority: 0, active: false, conditions: {}, assignedUserId: 7, assignedTeamId: 9 };
    expect((await call('put', '/versions/1/assignment-rules', { rules: [completeRule] })).status).toBe(200);
    expect((await call('put', '/versions/1/assignment-rules', { rules: [{ ...completeRule, triggerId: null }] })).status).toBe(200);
    expect(services.assign).toHaveBeenLastCalledWith(1, [{ ...completeRule, triggerId: null }], 7);
    for (const key of Object.keys(completeRule).filter(key => key !== 'triggerId')) {
      expect((await call('put', '/versions/1/assignment-rules', { rules: [{ ...completeRule, [key]: null }] })).status).toBe(400);
    }
    for (const key of ['contractId', 'taskId', 'subsystemTaskId', 'objectId', 'deviceId', 'bomItemId', 'workflowBomItemId', 'assignedUserId', 'assignedTeamId']) {
      for (const value of [null, 0, -1, 1.5, '1', 2147483648]) {
        expect((await call('post', '/instances', { templateVersionId: 1, [key]: value })).status).toBe(400);
      }
    }
    for (const key of ['sortOrder', 'conditions']) {
      expect((await call('put', '/versions/1/draft', { sections: [{ ...section, [key]: null }] })).status).toBe(400);
    }
    for (const key of ['required', 'sortOrder', 'validation', 'options', 'conditions']) {
      const field = { key: 'result', label: 'Result', fieldType: 'TEXT', [key]: null };
      expect((await call('put', '/versions/1/draft', { sections: [{ ...section, fields: [field] }] })).status).toBe(400);
    }
  });

  it('enforces section, per-section field, and assignment-rule array limits', async () => {
    const sections = Array.from({ length: 100 }, (_, index) => ({ key: `s${index}`, title: 'Section', fields: [] }));
    expect((await call('put', '/versions/1/draft', { sections })).status).toBe(200);
    expect((await call('put', '/versions/1/draft', { sections: [...sections, { key: 'extra', title: 'Extra', fields: [] }] })).status).toBe(400);
    const fields = Array.from({ length: 500 }, (_, index) => ({ key: `f${index}`, label: 'Field', fieldType: 'TEXT' }));
    const section = { key: 'main', title: 'Main' };
    expect((await call('put', '/versions/1/draft', { sections: [{ ...section, fields }] })).status).toBe(200);
    expect((await call('put', '/versions/1/draft', { sections: [{ ...section, fields: [...fields, { key: 'extra', label: 'Extra', fieldType: 'TEXT' }] }] })).status).toBe(400);
    const rules = Array.from({ length: 500 }, () => ({ assignedUserId: 7, triggerId: null }));
    expect((await call('put', '/versions/1/assignment-rules', { rules })).status).toBe(200);
    expect((await call('put', '/versions/1/assignment-rules', { rules: [...rules, { assignedUserId: 7, triggerId: null }] })).status).toBe(400);
  });

  it.each([
    ['responses', '/instances/1/values', (dictionary: unknown) => ({ responses: dictionary })],
    ['settings', '/versions/1/draft', (dictionary: unknown) => ({ settings: dictionary })],
    ['field validation', '/versions/1/draft', (dictionary: unknown) => ({ sections: [{ key: 'main', title: 'Main', fields: [{ key: 'result', label: 'Result', fieldType: 'TEXT', validation: dictionary }] }] })],
    ['field options', '/versions/1/draft', (dictionary: unknown) => ({ sections: [{ key: 'main', title: 'Main', fields: [{ key: 'result', label: 'Result', fieldType: 'TEXT', options: dictionary }] }] })],
    ['field conditions', '/versions/1/draft', (dictionary: unknown) => ({ sections: [{ key: 'main', title: 'Main', fields: [{ key: 'result', label: 'Result', fieldType: 'TEXT', conditions: dictionary }] }] })],
    ['section conditions', '/versions/1/draft', (dictionary: unknown) => ({ sections: [{ key: 'main', title: 'Main', conditions: dictionary, fields: [] }] })],
    ['rule conditions', '/versions/1/assignment-rules', (dictionary: unknown) => ({ rules: [{ assignedUserId: 7, conditions: dictionary }] })],
  ] as const)('rejects reserved JSON keys in %s before transformation without hanging', async (_name, path, body) => {
    for (const key of RESERVED_FORM_KEYS) {
      const dictionary = { [key]: { nested: true } };
      const response = await call('put', path, body(dictionary)).timeout({ deadline: 3000 });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      const nestedResponse = await call('put', path, body({ safe: [{ deeper: dictionary }] })).timeout({ deadline: 3000 });
      expect(nestedResponse.status).toBe(400);
    }
    expect(services.values).not.toHaveBeenCalled();
    expect(services.updateDraft).not.toHaveBeenCalled();
    expect(services.assign).not.toHaveBeenCalled();
  });

  it.each(RESERVED_FORM_KEYS)('rejects reserved scalar draft field/section key %s', async key => {
    expect((await call('put', '/versions/1/draft', { sections: [{
      key: 'main', title: 'Main', fields: [{ key, label: 'Reserved', fieldType: 'TEXT' }],
    }] })).status).toBe(400);
    expect((await call('put', '/versions/1/draft', { sections: [{ key, title: 'Reserved', fields: [] }] })).status).toBe(400);
    expect(services.updateDraft).not.toHaveBeenCalled();
  });

  it('retains regular JSON dictionaries and rejects excessive nesting before transformation', async () => {
    expect((await call('put', '/instances/1/values', { responses: { constructor: 'x' } })
      .timeout({ deadline: 3000 })).status).toBe(400);
    const responses = { result: 'PASS', nullable: null, numeric: 5, nested: { list: [1, null, { safe: true }] } };
    expect((await call('put', '/instances/1/values', { responses })).status).toBe(200);
    expect(services.values).toHaveBeenCalledWith(1, responses, 7, expect.any(Function));
    const settings = { nested: { options: ['a', 'b'], enabled: true }, data: null };
    const validation = { min: 1, message: { text: 'Required' } };
    const options = { values: ['a', 'b'], labels: { a: 'First', b: 'Second' } };
    const body = { settings, sections: [{
      key: 'main', title: 'Main', fields: [{ key: 'result', label: 'Result', fieldType: 'TEXT', validation, options }],
    }] };
    expect((await call('put', '/versions/1/draft', body)).status).toBe(200);
    expect(services.updateDraft).toHaveBeenLastCalledWith(1, body, 7);
    let deep: unknown = {};
    for (let index = 0; index < 51; index++) deep = { nested: deep };
    expect((await call('put', '/instances/1/values', { responses: { deep } })).status).toBe(400);
  });

  it('allows only standalone self-assigned creation without assign; contexts and arbitrary assignees require assign/all', async () => {
    grants.forms.assign = false;
    expect((await call('post', '/instances', { templateVersionId: 1 })).status).toBe(201);
    expect(services.createInstance).toHaveBeenLastCalledWith({ templateVersionId: 1, assignedUserId: 7 }, 7);
    expect((await call('post', '/instances', { templateVersionId: 1, assignedUserId: 7 })).status).toBe(201);
    for (const key of ['contractId', 'taskId', 'subsystemTaskId', 'objectId', 'deviceId', 'bomItemId', 'workflowBomItemId', 'assignedTeamId', 'assignedUserId']) {
      expect((await call('post', '/instances', { templateVersionId: 1, [key]: 9 })).status).toBe(403);
    }
    grants.forms.assign = true;
    expect((await call('post', '/instances', { templateVersionId: 1, contractId: 9, assignedTeamId: 9 })).status).toBe(201);
    grants = { all: true };
    expect((await call('post', '/instances', { templateVersionId: 1, assignedUserId: 9, deviceId: 9 })).status).toBe(201);
    expect(services.createInstance).toHaveBeenLastCalledWith({ templateVersionId: 1, assignedUserId: 9, deviceId: 9 }, 7);
  });

  it.each([
    ['creator', { createdById: 7 }, [], true],
    ['assigned user', { assignedUserId: 7 }, [], true],
    ['active brigade member', { assignedTeamId: 8 }, [{ userId: 7, brigadeId: 8, active: true, validFrom: '2000-01-01', validTo: null }], true],
    ['inclusive validity', { assignedTeamId: 8 }, [{ userId: 7, brigadeId: 8, active: true, validFrom: new Date().toISOString().slice(0, 10), validTo: new Date().toISOString().slice(0, 10) }], true],
    ['inactive brigade member', { assignedTeamId: 8 }, [{ userId: 7, brigadeId: 8, active: false, validFrom: '2000-01-01', validTo: null }], false],
    ['expired brigade member', { assignedTeamId: 8 }, [{ userId: 7, brigadeId: 8, active: true, validFrom: '2000-01-01', validTo: '2001-01-01' }], false],
    ['future brigade member', { assignedTeamId: 8 }, [{ userId: 7, brigadeId: 8, active: true, validFrom: '2999-01-01', validTo: null }], false],
    ['other brigade', { assignedTeamId: 8 }, [{ userId: 7, brigadeId: 9, active: true, validFrom: '2000-01-01', validTo: null }], false],
    ['other member', { assignedTeamId: 8 }, [{ userId: 9, brigadeId: 8, active: true, validFrom: '2000-01-01', validTo: null }], false],
    ['unrelated user', {}, [], false],
  ])('applies identical list/detail/value/edit/complete scope for %s', async (_name, fields, members, allowed) => {
    records = [{ id: 1, templateVersionId: 1, createdById: 99, assignedUserId: null, assignedTeamId: null, ...fields }];
    memberships = members;
    const listed = await call('get', '/instances');
    expect(listed.body.data.items).toHaveLength(allowed ? 1 : 0);
    for (const [method, path, body] of [
      ['get', '/instances/1', undefined], ['get', '/instances/1/values', undefined],
      ['put', '/instances/1/values', { responses: {} }], ['post', '/instances/1/complete', {}],
    ] as const) {
      expect((await call(method, path, body)).status).toBe(allowed ? 200 : 404);
    }
    const [sql, params] = query.andWhere.mock.calls.find(([sql]: [string]) => sql.includes('EXISTS'));
    expect(sql).toContain('member.active = TRUE');
    expect(sql).toContain('member.valid_from <= CURRENT_DATE');
    expect(sql).toContain('member.valid_to IS NULL OR member.valid_to >= CURRENT_DATE');
    expect(params).toEqual({ actorId: 7 });
    if (!allowed) {
      expect(repositories.get(FormFieldValue).find).not.toHaveBeenCalled();
    }
  });

  it.each([{ forms: { ...allActions, readAll: true } }, { all: true }])('permits readAll/all scope but retains action gates (%j)', async permissions => {
    grants = permissions;
    records = [{ id: 1, createdById: 99 }];
    expect((await call('get', '/instances')).body.data.items).toHaveLength(1);
    expect((await call('get', '/instances/1')).status).toBe(200);
    expect((await call('put', '/instances/1/values', { responses: {} })).status).toBe(200);
    expect((await call('post', '/instances/1/complete', {})).status).toBe(200);
    expect(query.andWhere.mock.calls.some(([sql]: [string]) => sql.includes('EXISTS'))).toBe(false);
    grants = { forms: { readAll: true } };
    expect((await call('get', '/instances')).status).toBe(403);
  });

  it('approve/reject/assign privileges are cross-record and do not require ownership', async () => {
    records = [];
    grants.forms.read = false;
    expect((await call('post', '/instances/99/approve', {})).status).toBe(200);
    expect((await call('post', '/instances/99/reject', { comment: 'Rework' })).status).toBe(200);
    expect((await call('put', '/versions/99/assignment-rules', { rules: [] })).status).toBe(200);
    expect((await call('put', '/instances/99/assignment', { assignedTeamId: null, assignedUserId: 9 })).status).toBe(200);
    expect(services.assign).toHaveBeenCalledWith(99, [], 7);
    expect(services.assignInstance).toHaveBeenCalledWith(99, { assignedTeamId: null, assignedUserId: 9 }, 7);
    expect(query.getOne).not.toHaveBeenCalled();
  });

  it('reads version aggregate with fixed parallel queries and no sensitive User relations', async () => {
    const response = await call('get', '/versions/1');
    expect(response.body.data).toMatchObject({ id: 1, sections: [{ id: 1 }], fields: [{ key: 'result' }], triggers: [{ id: 1 }], assignmentRules: [{ assignedUserId: 9 }] });
    for (const entity of [FormSection, FormFieldDefinition, FormTrigger, FormAssignmentRule]) {
      expect(repositories.get(entity).find).toHaveBeenCalledTimes(1);
      expect(repositories.get(entity).find).toHaveBeenCalledWith(expect.objectContaining({ where: { templateVersionId: 1 } }));
      expect(repositories.get(entity).find.mock.calls[0][0].relations).toBeUndefined();
    }
  });

  it.each([
    ['/templates/1', FormTemplate, 'TEMPLATE_NOT_FOUND'],
    ['/templates/1/versions', FormTemplate, 'TEMPLATE_NOT_FOUND'],
    ['/versions/1', FormTemplateVersion, 'VERSION_NOT_FOUND'],
    ['/versions/1/assignment-rules', FormTemplateVersion, 'VERSION_NOT_FOUND'],
  ])('returns domain 404 for missing resource %s', async (path, entity, code) => {
    repositories.get(entity).findOne.mockResolvedValue(null);
    const response = await call('get', path as string);
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, code });
  });

  it.each([
    ['createDraft', 'post', '/templates/1/draft', {}, 'DRAFT_ALREADY_EXISTS', 409],
    ['publish', 'post', '/versions/1/publish', {}, 'VERSION_NOT_DRAFT', 409],
    ['publish', 'post', '/versions/1/publish', {}, 'INVALID_DEFINITION', 400],
    ['next', 'post', '/versions/1/next', {}, 'VERSION_NOT_PUBLISHED', 409],
    ['createInstance', 'post', '/instances', { templateVersionId: 1 }, 'VERSION_NOT_FOUND', 404],
    ['createInstance', 'post', '/instances', { templateVersionId: 1 }, 'VERSION_NOT_PUBLISHED', 409],
    ['assignInstance', 'put', '/instances/1/assignment', {}, 'INVALID_ASSIGNMENT', 400],
    ['assignInstance', 'put', '/instances/1/assignment', { assignedUserId: null, assignedTeamId: null }, 'INVALID_ASSIGNMENT', 400],
    ['assignInstance', 'put', '/instances/99/assignment', { assignedUserId: 9 }, 'INSTANCE_NOT_FOUND', 404],
    ['assignInstance', 'put', '/instances/1/assignment', { assignedUserId: 9 }, 'INVALID_INSTANCE_STATUS', 409],
    ['values', 'put', '/instances/1/values', { responses: { forged: 1 } }, 'INVALID_RESPONSES', 400],
    ['complete', 'post', '/instances/1/complete', {}, 'INVALID_RESPONSES', 400],
    ['approve', 'post', '/instances/1/approve', {}, 'INVALID_INSTANCE_STATUS', 409],
    ['reject', 'post', '/instances/1/reject', { comment: 'Rework' }, 'INSTANCE_NOT_FOUND', 404],
    ['reject', 'post', '/instances/1/reject', { comment: 'Rework' }, 'REJECTION_COMMENT_REQUIRED', 400],
  ])('maps service error %s/%s without duplicating lifecycle', async (service, method, path, body, code, status) => {
    (services as any)[service].mockRejectedValue(new FormDomainError(code as FormDomainErrorCode, 'Domain message', { errors: ['stored definition error'] }));
    const response = await call(method as string, path as string, body);
    expect(response.status).toBe(status);
    expect(response.body).toEqual({ success: false, message: 'Domain message', code, details: { errors: ['stored definition error'] } });
  });

  it.each([
    [new Error('password secret internal detail'), 500],
    [new QueryFailedError('SELECT password FROM users', [], { code: '23505', message: 'secret unique detail' } as any), 409],
    [new QueryFailedError('SELECT password FROM users', [], { code: 'XX000', message: 'secret SQL detail' } as any), 500],
  ])('forwards unexpected/DB errors to existing sanitized handler', async (error, status) => {
    services.createTemplate.mockRejectedValue(error);
    const response = await call('post', '/templates', templateBody);
    expect(response.status).toBe(status);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body)).not.toMatch(/secret|password|SELECT|stack|query/);
  });

  it('sanitizes reassignment FK failures via the existing DB handler', async () => {
    services.assignInstance.mockRejectedValue(new QueryFailedError('UPDATE assigned_user_id=999', [], {
      code: '23503', message: 'secret FK user detail',
    } as any));
    const response = await call('put', '/instances/1/assignment', { assignedUserId: 999 });
    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body)).not.toMatch(/secret|FK|assigned_user_id|stack|query/);
  });

  it('returns 400 for mutually exclusive BOM contexts before any DB operation', async () => {
    services.createInstance.mockImplementation(function (this: FormInstanceService, input, actorId) {
      return realCreateInstance.call(this, input, actorId);
    });
    const response = await call('post', '/instances', { templateVersionId: 1, bomItemId: 2, workflowBomItemId: 3 });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, code: 'INVALID_INSTANCE_CONTEXT' });
  });

  it.each([
    ['put', '/instances/1/values', { responses: { result: 'PASS' } }],
    ['post', '/instances/1/complete', {}],
  ])('rechecks current assignment after the transaction row lock for %s %s', async (method, path, body) => {
    records = [{ id: 1, templateVersionId: 1, createdById: 99, assignedUserId: 7, assignedTeamId: null }];
    expect((await call('get', '/instances/1')).status).toBe(200);
    (AppDataSource.getRepository as jest.Mock).mockClear();
    const instanceRepository = repositories.get(FormInstance);
    instanceRepository.findOne.mockImplementation(async () => {
      records[0].assignedUserId = 9;
      return records[0];
    });
    const manager = { getRepository: jest.fn(entity => repositories.get(entity)), query: jest.fn() };
    (AppDataSource.transaction as jest.Mock).mockImplementation(callback => callback(manager));
    services.values.mockImplementation(function (this: FormInstanceService, id, responses, actor, guard) {
      return realSaveResponses.call(this, id, responses, actor, guard);
    });
    services.complete.mockImplementation(function (this: FormInstanceService, id, actor, guard) {
      return realComplete.call(this, id, actor, guard);
    });
    const response = await call(method as string, path as string, body);
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, code: 'INSTANCE_NOT_FOUND' });
    expect(instanceRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, lock: { mode: 'pessimistic_write' } });
    expect(manager.getRepository).toHaveBeenCalledWith(FormInstance);
    expect(AppDataSource.getRepository).not.toHaveBeenCalledWith(FormInstance);
    expect(instanceRepository.save).not.toHaveBeenCalled();
    expect(repositories.get(FormFieldValue).find).not.toHaveBeenCalled();
    expect(repositories.get(FormFieldValue).save).not.toHaveBeenCalled();
    expect(manager.query).not.toHaveBeenCalled();
  });
});

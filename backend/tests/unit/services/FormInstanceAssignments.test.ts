import { FormInstance } from '../../../src/entities/FormInstance';
import { FormInstanceStatus } from '../../../src/entities/FormTypes';
import { FormTemplateVersion } from '../../../src/entities/FormTemplateVersion';
import { FormInstanceService } from '../../../src/services/FormInstanceService';
import { FormAuditService } from '../../../src/services/FormAuditService';
import { FormDomainError } from '../../../src/errors/FormDomainError';

jest.mock('../../../src/config/database', () => ({ AppDataSource: {} }));

describe('FormInstanceService.assignInstance', () => {
  let service: FormInstanceService;
  let instance: any;
  let repository: any;
  let manager: any;
  let transaction: jest.Mock;
  let audit: jest.SpyInstance;

  beforeEach(() => {
    instance = { id: 1, templateVersionId: 4, status: FormInstanceStatus.DRAFT, createdById: 2, assignedUserId: 7, assignedTeamId: null };
    repository = { findOne: jest.fn(async () => instance), save: jest.fn(async value => value) };
    manager = { getRepository: jest.fn(() => repository), query: jest.fn().mockResolvedValue(undefined) };
    transaction = jest.fn(callback => callback(manager));
    service = new FormInstanceService({ transaction } as any);
    audit = jest.spyOn(FormAuditService, 'record');
  });

  describe('FormInstanceService.createInstance BOM context validation', () => {
    it('rejects both BOM context IDs before starting a transaction or touching the DB', async () => {
      const transaction = jest.fn();
      const service = new FormInstanceService({ transaction } as any);
      await expect(service.createInstance({ templateVersionId: 1, bomItemId: 2, workflowBomItemId: 3 }, 7))
        .rejects.toMatchObject({ code: 'INVALID_INSTANCE_CONTEXT' });
      expect(transaction).not.toHaveBeenCalled();
    });

    it.each([
      { bomItemId: 2 },
      { workflowBomItemId: 3 },
      { bomItemId: 2, workflowBomItemId: null },
      { bomItemId: null, workflowBomItemId: 3 },
      { bomItemId: null, workflowBomItemId: null },
    ])('permits a single BOM context with an omitted/null counterpart (%j)', async context => {
      const instances = { create: jest.fn(value => value), save: jest.fn(async value => ({ id: 1, ...value })) };
      const versions = { findOne: jest.fn().mockResolvedValue({ id: 1, status: 'PUBLISHED' }) };
      const manager = {
        getRepository: jest.fn(entity => entity === FormTemplateVersion ? versions : instances),
        query: jest.fn().mockResolvedValue(undefined),
      };
      const service = new FormInstanceService({ transaction: jest.fn(callback => callback(manager)) } as any);
      await expect(service.createInstance({ templateVersionId: 1, ...context }, 7))
        .resolves.toMatchObject({ id: 1, ...context, createdById: 7 });
      expect(instances.save).toHaveBeenCalled();
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([FormInstanceStatus.DRAFT, FormInstanceStatus.IN_PROGRESS, FormInstanceStatus.REJECTED])(
    'reassigns an editable %s instance with the existing row lock and audited previous/new targets',
    async status => {
      instance.status = status;
      const result = await service.assignInstance(1, { assignedUserId: 9, assignedTeamId: 8 }, 3);
      expect(result).toEqual({
        id: 1, templateVersionId: 4, status, createdById: 2, assignedUserId: 9, assignedTeamId: 8,
      });
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(manager.getRepository).toHaveBeenCalledWith(FormInstance);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, lock: { mode: 'pessimistic_write' } });
      expect(audit).toHaveBeenCalledWith(manager, 'FORM_INSTANCE_ASSIGNED', 3, 'form_instance', 1, [
        { field: 'assignedUserId', previousValue: 7, newValue: 9 },
        { field: 'assignedTeamId', previousValue: null, newValue: 8 },
      ]);
      expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining(['FORM_INSTANCE_ASSIGNED', 3]));
    },
  );

  it('retains an omitted user target when assigning a brigade', async () => {
    expect(await service.assignInstance(1, { assignedTeamId: 8 }, 3)).toMatchObject({ assignedUserId: 7, assignedTeamId: 8 });
  });

  it('retains an omitted brigade target when assigning a user', async () => {
    instance.assignedTeamId = 8;
    expect(await service.assignInstance(1, { assignedUserId: 9 }, 3)).toMatchObject({ assignedUserId: 9, assignedTeamId: 8 });
  });

  it('permits explicit clearing of the user when a brigade target remains', async () => {
    instance.assignedTeamId = 8;
    expect(await service.assignInstance(1, { assignedUserId: null }, 3)).toMatchObject({ assignedUserId: null, assignedTeamId: 8 });
  });

  it('permits explicit clearing of the brigade when a user target remains', async () => {
    instance.assignedTeamId = 8;
    expect(await service.assignInstance(1, { assignedTeamId: null }, 3)).toMatchObject({ assignedUserId: 7, assignedTeamId: null });
  });

  it.each([{}, { assignedUserId: null }, { assignedUserId: null, assignedTeamId: null }])(
    'rejects empty updates or updates leaving no assignment (%j)',
    async input => {
      await expect(service.assignInstance(1, input, 3)).rejects.toMatchObject({ code: 'INVALID_ASSIGNMENT' });
      expect(repository.save).not.toHaveBeenCalled();
      expect(audit).not.toHaveBeenCalled();
    },
  );

  it.each([FormInstanceStatus.SUBMITTED, FormInstanceStatus.APPROVED, FormInstanceStatus.CANCELLED])(
    'rejects reassignment of immutable %s instances',
    async status => {
      instance.status = status;
      await expect(service.assignInstance(1, { assignedUserId: 9 }, 3)).rejects.toMatchObject({ code: 'INVALID_INSTANCE_STATUS' });
      expect(repository.save).not.toHaveBeenCalled();
      expect(audit).not.toHaveBeenCalled();
    },
  );

  it('returns the existing domain error for a missing instance', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.assignInstance(99, { assignedUserId: 9 }, 3)).rejects.toMatchObject({ code: 'INSTANCE_NOT_FOUND' });
    expect(repository.save).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it('propagates FK/database failures for rollback and sanitized HTTP handling', async () => {
    const error = new Error('foreign key');
    repository.save.mockRejectedValue(error);
    await expect(service.assignInstance(1, { assignedUserId: 999 }, 3)).rejects.toBe(error);
    expect(audit).not.toHaveBeenCalled();
  });

  it('propagates audit failures inside the same assignment transaction', async () => {
    const error = new Error('audit failure');
    manager.query.mockRejectedValue(error);
    await expect(service.assignInstance(1, { assignedUserId: 9 }, 3)).rejects.toBe(error);
    expect(repository.save).toHaveBeenCalled();
  });

  it.each(['responses', 'complete'])('checks the optional %s access guard against the locked record before any mutation', async operation => {
    repository.findOne.mockImplementation(async () => {
      instance.assignedUserId = 9;
      return instance;
    });
    const guard = jest.fn(async (transactionManager, lockedInstance) => {
      expect(transactionManager).toBe(manager);
      expect(lockedInstance).toBe(instance);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, lock: { mode: 'pessimistic_write' } });
      expect(lockedInstance.assignedUserId).toBe(9);
      throw new FormDomainError('INSTANCE_NOT_FOUND', 'Form instance was not found');
    });
    const mutation = operation === 'responses'
      ? service.saveResponses(1, { result: 'PASS' }, 7, guard)
      : service.complete(1, 7, guard);
    await expect(mutation).rejects.toMatchObject({ code: 'INSTANCE_NOT_FOUND' });
    expect(guard).toHaveBeenCalledTimes(1);
    expect(repository.save).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it.each(['responses', 'complete'])('allows the %s mutation after a successful guard on the locked instance', async operation => {
    manager.getRepository.mockImplementation((entity: unknown) => entity === FormInstance
      ? repository : { find: jest.fn().mockResolvedValue([]) });
    const guard = jest.fn().mockResolvedValue(undefined);
    if (operation === 'responses') await service.saveResponses(1, {}, 7, guard);
    else await service.complete(1, 7, guard);
    expect(guard).toHaveBeenCalledWith(manager, instance);
    expect(repository.findOne.mock.invocationCallOrder[0]).toBeLessThan(guard.mock.invocationCallOrder[0]);
    expect(guard.mock.invocationCallOrder[0]).toBeLessThan(repository.save.mock.invocationCallOrder[0]);
    expect(instance.status).toBe(operation === 'responses' ? FormInstanceStatus.IN_PROGRESS : FormInstanceStatus.SUBMITTED);
    expect(audit).toHaveBeenCalled();
  });
});

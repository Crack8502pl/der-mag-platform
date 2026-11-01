// tests/unit/modules/function-groups/FunctionGroupService.test.ts
import { AppDataSource } from '../../../../src/config/database';
import { User } from '../../../../src/entities/User';
import { FunctionGroup } from '../../../../src/modules/function-groups/entities/FunctionGroup';
import { UserFunctionGroup } from '../../../../src/modules/function-groups/entities/UserFunctionGroup';
import {
  FunctionGroupError,
  FunctionGroupService,
  validateFunctionGroupPermissions,
} from '../../../../src/modules/function-groups/services/FunctionGroupService';
import { CreateFunctionGroups1793553600000 } from '../../../../src/migrations/20261101_create_function_groups';

jest.mock('../../../../src/config/database', () => ({
  AppDataSource: { getRepository: jest.fn(), transaction: jest.fn() },
}));

const HOUR = 60 * 60 * 1000;
let groups: any[];
let memberships: any[];
let query: jest.Mock;

function repositories(entity: unknown) {
  if (entity === FunctionGroup) {
    return {
      findOne: jest.fn(async ({ where }: any) => groups.find(group =>
        (where.id === undefined || group.id === where.id) && (where.key === undefined || group.key === where.key)) ?? null),
      create: jest.fn((data: any) => data),
      save: jest.fn(async (data: any) => {
        const saved = { id: data.id ?? groups.length + 1, ...data };
        groups = groups.filter(group => group.id !== saved.id).concat(saved);
        return saved;
      }),
    };
  }
  if (entity === UserFunctionGroup) {
    return {
      find: jest.fn(async ({ where }: any) => memberships.filter(item =>
        item.userId === where.userId && item.functionGroupId === where.functionGroupId)),
      create: jest.fn((data: any) => data),
      save: jest.fn(async (data: any) => {
        const saved = { id: data.id ?? memberships.length + 1, createdAt: new Date(), ...data };
        memberships = memberships.filter(item => item.id !== saved.id).concat(saved);
        return saved;
      }),
    };
  }
  if (entity === User) {
    return { findOne: jest.fn(async ({ where }: any) => (where.id === 7 ? { id: 7, firstName: 'Jan', lastName: 'Kowalski' } : null)) };
  }
  return undefined;
}

function auditCalls() {
  return query.mock.calls
    .filter(([sql]) => String(sql).includes('INSERT INTO audit_logs'))
    .map(([, params]) => ({ eventType: params[0], actorId: params[1], details: JSON.parse(params[2]) }));
}

beforeEach(() => {
  groups = [{ id: 1, key: 'PROCESS_AUDITORS', name: 'Audytorzy procesów', description: null, permissions: {}, active: true }];
  memberships = [];
  query = jest.fn().mockResolvedValue(undefined);
  (AppDataSource.getRepository as jest.Mock).mockImplementation(repositories);
  (AppDataSource.transaction as jest.Mock).mockImplementation(async (callback: any) =>
    callback({ getRepository: repositories, query }));
});

afterEach(() => jest.clearAllMocks());

describe('validateFunctionGroupPermissions', () => {
  it('accepts the role permission format', () => {
    expect(validateFunctionGroupPermissions({ contracts: { create: true, delete: false } })).toBeNull();
    expect(validateFunctionGroupPermissions({})).toBeNull();
  });

  it('rejects "all" and malformed values', () => {
    expect(validateFunctionGroupPermissions({ all: true })).toMatch(/wszystko/);
    expect(validateFunctionGroupPermissions({ contracts: { create: 'yes' } })).toMatch(/true albo false/);
    expect(validateFunctionGroupPermissions({ contracts: true })).toMatch(/obiektem/);
    expect(validateFunctionGroupPermissions([])).toMatch(/obiektem/);
  });
});

describe('FunctionGroupService', () => {
  it('refuses to create or edit a function with "all"', async () => {
    await expect(FunctionGroupService.create({ key: 'SUPER', name: 'Super', permissions: { all: true } }, 1))
      .rejects.toMatchObject({ status: 400 });
    await expect(FunctionGroupService.update(1, { permissions: { all: true } }, 1))
      .rejects.toBeInstanceOf(FunctionGroupError);
    expect(query).not.toHaveBeenCalled();
  });

  it('validates the key format', async () => {
    await expect(FunctionGroupService.create({ key: 'process auditors', name: 'X' }, 1)).rejects.toMatchObject({ status: 400 });
    await expect(FunctionGroupService.create({ key: 'PROCESS_AUDITORS', name: 'X' }, 1)).rejects.toMatchObject({ status: 409 });
  });

  it('audits creation and permission changes with values before and after', async () => {
    const created = await FunctionGroupService.create({ key: 'CONTRACT_CREATORS', name: 'Twórcy kontraktów' }, 1);
    await FunctionGroupService.update(created.id, { permissions: { contracts: { create: true } } }, 1);
    await FunctionGroupService.deactivate(created.id, 1);

    expect(auditCalls()).toEqual([
      expect.objectContaining({
        eventType: 'FUNCTION_GROUP_CREATED',
        actorId: 1,
        details: expect.objectContaining({ functionKey: 'CONTRACT_CREATORS', before: null }),
      }),
      expect.objectContaining({
        eventType: 'FUNCTION_GROUP_UPDATED',
        details: expect.objectContaining({
          before: expect.objectContaining({ permissions: {} }),
          after: expect.objectContaining({ permissions: { contracts: { create: true } } }),
        }),
      }),
      expect.objectContaining({
        eventType: 'FUNCTION_GROUP_DEACTIVATED',
        details: expect.objectContaining({
          before: expect.objectContaining({ active: true }),
          after: expect.objectContaining({ active: false }),
        }),
      }),
    ]);
  });

  it('audits adding and removing a member and keeps the history row', async () => {
    const validFrom = new Date(Date.now() - HOUR);
    await FunctionGroupService.addMember(1, { userId: 7, validFrom: validFrom.toISOString() }, 1);
    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({ userId: 7, functionGroupId: 1, grantedById: 1, validTo: null });

    await FunctionGroupService.removeMember(1, 7, 1);

    expect(memberships).toHaveLength(1);
    expect(memberships[0].validTo).toBeInstanceOf(Date);
    expect(memberships[0].validTo.getTime()).toBeLessThanOrEqual(Date.now());
    expect(auditCalls()).toEqual([
      {
        eventType: 'FUNCTION_GROUP_MEMBER_ADDED',
        actorId: 1,
        details: expect.objectContaining({
          targetType: 'function_group',
          functionKey: 'PROCESS_AUDITORS',
          targetUserId: 7,
          validFrom: validFrom.toISOString(),
          validTo: null,
          before: null,
        }),
      },
      {
        eventType: 'FUNCTION_GROUP_MEMBER_REMOVED',
        actorId: 1,
        details: expect.objectContaining({
          functionKey: 'PROCESS_AUDITORS',
          targetUserId: 7,
          before: { validFrom: validFrom.toISOString(), validTo: null },
          after: { validFrom: validFrom.toISOString(), validTo: memberships[0].validTo.toISOString() },
        }),
      },
    ]);
  });

  it('rejects overlapping periods, wrong dates and unknown people', async () => {
    await FunctionGroupService.addMember(1, { userId: 7 }, 1);
    await expect(FunctionGroupService.addMember(1, { userId: 7 }, 1)).rejects.toMatchObject({ status: 409 });
    await expect(FunctionGroupService.addMember(1, {
      userId: 7, validFrom: '2026-12-01T00:00:00Z', validTo: '2026-11-01T00:00:00Z',
    }, 1)).rejects.toMatchObject({ status: 400 });
    await expect(FunctionGroupService.addMember(1, { userId: 99 }, 1)).rejects.toMatchObject({ status: 404 });
    await expect(FunctionGroupService.removeMember(1, 99, 1)).rejects.toMatchObject({ status: 404 });
  });

  it('ends a future membership at its start so it never applies', async () => {
    const start = new Date(Date.now() + 24 * HOUR);
    await FunctionGroupService.addMember(1, { userId: 7, validFrom: start.toISOString() }, 1);
    await FunctionGroupService.removeMember(1, 7, 1);
    expect(memberships[0].validTo.getTime()).toBe(start.getTime());
  });
});

describe('CreateFunctionGroups migration', () => {
  it('creates both tables with timestamptz columns and forbids "all"', async () => {
    const runner = { query: jest.fn().mockResolvedValue(undefined) };
    await new CreateFunctionGroups1793553600000().up(runner as any);
    const sql = runner.query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS function_groups');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS user_function_groups');
    expect(sql).toContain("NOT (permissions ? 'all')");
    expect(sql).toContain('valid_from TIMESTAMPTZ NOT NULL DEFAULT now()');
    expect(sql).toContain('UNIQUE (user_id, function_group_id, valid_from)');
    expect(sql).not.toMatch(/TIMESTAMP(?!TZ)/);
  });
});

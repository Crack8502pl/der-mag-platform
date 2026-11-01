// tests/unit/modules/function-groups/EffectivePermissions.test.ts
import { Request, Response } from 'express';
import { AppDataSource } from '../../../../src/config/database';
import { User } from '../../../../src/entities/User';
import { requireAnyPermission, requirePermission } from '../../../../src/middleware/PermissionMiddleware';
import { checkPermission, requireAdmin } from '../../../../src/middleware/permissions';
import { EffectivePermissionsService } from '../../../../src/modules/function-groups/services/EffectivePermissionsService';
import { createMockNext, createMockRequest, createMockResponse } from '../../../mocks/request.mock';

jest.mock('../../../../src/config/database', () => ({ AppDataSource: { getRepository: jest.fn() } }));

const HOUR = 60 * 60 * 1000;
const viewerRole = { id: 10, name: 'viewer', permissions: { contracts: { read: true }, tasks: { update: 'OWN' } } };
const contractCreators = { id: 1, key: 'CONTRACT_CREATORS', name: 'Twórcy kontraktów', active: true, permissions: { contracts: { create: true } } };

function membership(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 7,
    functionGroupId: contractCreators.id,
    validFrom: new Date(Date.now() - HOUR),
    validTo: null,
    functionGroup: contractCreators,
    ...overrides,
  };
}

let user: any;
let findOne: jest.Mock;

beforeEach(() => {
  user = { id: 7, role: viewerRole, functionGroupMemberships: [] };
  findOne = jest.fn(async () => user);
  (AppDataSource.getRepository as jest.Mock).mockImplementation(entity => (entity === User ? { findOne } : undefined));
});

afterEach(() => jest.clearAllMocks());

async function runMiddleware(middleware: (req: Request, res: Response, next: () => void) => Promise<void>) {
  const req = createMockRequest({ userId: 7 }) as Request;
  const res = createMockResponse() as Response;
  const next = createMockNext();
  await middleware(req, res, next);
  return { res, next };
}

describe('EffectivePermissionsService', () => {
  it('adds a permission from an active function to a role that lacks it', async () => {
    user.functionGroupMemberships = [membership()];

    const effective = await EffectivePermissionsService.get(7);

    expect(effective?.permissions).toEqual({
      contracts: { read: true, create: true },
      tasks: { update: 'OWN' },
    });
    expect(effective?.rolePermissions).toBe(viewerRole.permissions);
    expect(effective?.functionGroups).toEqual([{ id: 1, key: 'CONTRACT_CREATORS', name: 'Twórcy kontraktów' }]);
    expect(viewerRole.permissions).toEqual({ contracts: { read: true }, tasks: { update: 'OWN' } });
  });

  it.each([
    ['after valid_to', membership({ validTo: new Date(Date.now() - 1000) })],
    ['before valid_from', membership({ validFrom: new Date(Date.now() + HOUR) })],
    ['inactive function', membership({ functionGroup: { ...contractCreators, active: false } })],
  ])('ignores a function %s', async (_label, inactive) => {
    user.functionGroupMemberships = [inactive];

    const effective = await EffectivePermissionsService.get(7);

    expect(effective?.permissions).toEqual(viewerRole.permissions);
    expect(effective?.functionGroups).toEqual([]);
  });

  it('treats valid_to as exclusive and valid_from as inclusive', () => {
    const at = new Date('2026-11-01T12:00:00Z');
    expect(EffectivePermissionsService.isMembershipActive({ validFrom: at, validTo: null }, at)).toBe(true);
    expect(EffectivePermissionsService.isMembershipActive({ validFrom: new Date(at.getTime() - HOUR), validTo: at }, at)).toBe(false);
  });

  it('never takes "all" or false values from a function', () => {
    const merged = EffectivePermissionsService.merge({ contracts: { read: true } }, [
      { all: true, contracts: { read: false, delete: false }, users: { read: true } } as any,
    ]);
    expect(merged).toEqual({ contracts: { read: true }, users: { read: true } });
  });

  it('keeps the admin role unchanged', () => {
    const admin = { all: true };
    expect(EffectivePermissionsService.merge(admin, [{ contracts: { create: true } }])).toBe(admin);
  });

  it('returns null when the user or role does not exist', async () => {
    user = null;
    await expect(EffectivePermissionsService.get(7)).resolves.toBeNull();
  });

  it('loads permissions once per request', async () => {
    const req = createMockRequest({ userId: 7 }) as Request;
    await EffectivePermissionsService.forRequest(req);
    await EffectivePermissionsService.forRequest(req);
    expect(findOne).toHaveBeenCalledTimes(1);

    await EffectivePermissionsService.forRequest(createMockRequest({ userId: 7 }) as Request);
    expect(findOne).toHaveBeenCalledTimes(2);
  });
});

describe('permission middleware with function groups', () => {
  it('requirePermission grants access through a function', async () => {
    user.functionGroupMemberships = [membership()];
    const { res, next } = await runMiddleware(requirePermission('contracts', 'create'));
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('requirePermission denies access after the function was taken away', async () => {
    user.functionGroupMemberships = [membership({ validTo: new Date(Date.now() - 1000) })];
    const { res, next } = await runMiddleware(requirePermission('contracts', 'create'));
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('requireAnyPermission and checkPermission use effective permissions', async () => {
    user.functionGroupMemberships = [membership()];
    expect((await runMiddleware(requireAnyPermission(['contracts', 'create'], ['users', 'delete']))).next).toHaveBeenCalled();
    expect((await runMiddleware(checkPermission('contracts', 'create'))).next).toHaveBeenCalled();
    expect((await runMiddleware(checkPermission('contracts', 'delete'))).next).not.toHaveBeenCalled();
  });

  it('requireAdmin is not satisfied by a function', async () => {
    user.functionGroupMemberships = [membership({
      functionGroup: { ...contractCreators, permissions: { all: true, users: { update: true } } },
    })];
    const { res, next } = await runMiddleware(requireAdmin);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

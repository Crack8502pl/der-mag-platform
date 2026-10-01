import { requireCompletionOrderAccess, restrictCompletionListScope } from '../../../src/middleware/CompletionOrderAccess';
import { createMockRequest, createMockResponse, createMockNext } from '../../mocks/request.mock';
import { canAccessCompletionOrder } from '../../../src/services/CompletionOrderAccessService';
import { AppDataSource } from '../../../src/config/database';

jest.mock('../../../src/config/database', () => ({ AppDataSource: { getRepository: jest.fn() } }));
jest.mock('../../../src/utils/logger', () => ({ serverLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const worker = { id: 5, role: { permissions: { completion: { read: true, scan: true } } } };
const manager = { id: 9, role: { permissions: { completion: { read: true, decideContinue: true } } } };
const admin = { id: 1, role: { permissions: { all: true } } };

function mockRepos(user: any, order: any) {
  (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => ({
    findOne: jest.fn().mockResolvedValue(entity.name === 'User' ? user : order)
  }));
}

describe('canAccessCompletionOrder', () => {
  it('worker: own order only', () => {
    expect(canAccessCompletionOrder(worker, { assignedToId: 5 })).toBe(true);
    expect(canAccessCompletionOrder(worker, { assignedToId: 6 })).toBe(false);
    expect(canAccessCompletionOrder(worker, { assignedToId: null })).toBe(false);
  });
  it('admin and manager: any order', () => {
    expect(canAccessCompletionOrder(admin, { assignedToId: 6 })).toBe(true);
    expect(canAccessCompletionOrder(manager, { assignedToId: 6 })).toBe(true);
  });
});

describe('requireCompletionOrderAccess', () => {
  const run = async (userId: number) => {
    const req = createMockRequest({ params: { id: '10' }, userId }) as any;
    const res = createMockResponse() as any;
    const next = createMockNext();
    await requireCompletionOrderAccess(req, res, next);
    return { res, next };
  };

  it('blocks worker reading foreign order with 404', async () => {
    mockRepos(worker, { id: 10, assignedToId: 6 });
    const { res, next } = await run(5);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });
  it('allows worker own order', async () => {
    mockRepos(worker, { id: 10, assignedToId: 5 });
    const { next } = await run(5);
    expect(next).toHaveBeenCalled();
  });
  it('allows admin', async () => {
    mockRepos(admin, { id: 10, assignedToId: 6 });
    const { next } = await run(1);
    expect(next).toHaveBeenCalled();
  });
  it('404 for missing order', async () => {
    mockRepos(worker, null);
    const { res } = await run(5);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('restrictCompletionListScope', () => {
  it('forces worker to own orders', () => {
    const req = createMockRequest({ userId: 5, query: { all: '1', assignedTo: '6' }, user: { permissions: worker.role.permissions } }) as any;
    const next = createMockNext();
    restrictCompletionListScope(req, {} as any, next);
    expect(req.query).toEqual({ assignedTo: '5' });
    expect(next).toHaveBeenCalled();
  });
  it('leaves admin query untouched', () => {
    const req = createMockRequest({ userId: 1, query: { all: '1' }, user: { permissions: admin.role.permissions } }) as any;
    restrictCompletionListScope(req, {} as any, createMockNext());
    expect(req.query).toEqual({ all: '1' });
  });
});

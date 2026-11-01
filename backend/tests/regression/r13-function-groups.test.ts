// R13 – Funkcje (grupy funkcyjne) nadawane osobowo obok ról.
import { createUser, currentUserId, expectStatus, login, loginAdmin, unique } from './helpers';

describe('R13: funkcje nadawane osobowo', () => {
  it('viewer z funkcją contracts.create tworzy kontrakt; po odebraniu funkcji dostaje 403', async () => {
    const admin = await loginAdmin();
    const viewer = await createUser(admin, 'viewer');
    const { session, response } = await login(viewer.username, viewer.password);
    expectStatus(response, 200, 'logowanie viewer');
    const projectManagerId = await currentUserId(admin);
    const contractPayload = () => ({
      customName: unique('Kontrakt funkcji'),
      orderDate: new Date().toISOString().slice(0, 10),
      managerCode: 'REG',
      projectManagerId,
    });

    const key = `REG_${unique('').replace(/[^a-z0-9]/gi, '').toUpperCase()}`;
    const group = expectStatus(await admin.post('/api/admin/function-groups', {
      key,
      name: `Funkcja regresji ${key}`,
      permissions: { contracts: { create: true } },
    }), 201, 'POST /api/admin/function-groups').data;

    // Funkcja nie może mieć „all” i nie daje dostępu do /api/admin.
    expect((await admin.put(`/api/admin/function-groups/${group.id}`, { permissions: { all: true } })).status).toBe(400);

    expect((await session.post('/api/contracts', contractPayload())).status).toBe(403);

    expectStatus(await admin.post(`/api/admin/function-groups/${group.id}/members`, { userId: viewer.id }), 201,
      'POST /api/admin/function-groups/:id/members');

    const me = expectStatus(await session.get('/api/auth/me'), 200, 'GET /api/auth/me');
    expect(me.data.role).toBe('viewer');
    expect(me.data.permissions.contracts.create).toBe(true);
    expect(me.data.functionGroups).toEqual([{ key, name: group.name }]);

    expectStatus(await session.post('/api/contracts', contractPayload()), 201, 'POST /api/contracts (viewer z funkcją)');
    expect((await session.get('/api/admin/users')).status).toBe(403);
    expect((await session.get('/api/admin/function-groups')).status).toBe(403);

    expectStatus(await admin.delete(`/api/admin/function-groups/${group.id}/members/${viewer.id}`), 200,
      'DELETE /api/admin/function-groups/:id/members/:userId');
    expect((await session.post('/api/contracts', contractPayload())).status).toBe(403);

    const meAfter = expectStatus(await session.get('/api/auth/me'), 200, 'GET /api/auth/me (po odebraniu)');
    expect(meAfter.data.functionGroups).toEqual([]);

    // Historia członkostwa zostaje.
    const history = expectStatus(await admin.get(`/api/admin/users/${viewer.id}/function-groups`), 200,
      'GET /api/admin/users/:id/function-groups').data;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ isActive: false, functionGroup: { key } });
    expect(history[0].validTo).toBeTruthy();
  });

  it('seeder utworzył funkcje Etapu 2', async () => {
    const admin = await loginAdmin();
    const groups = expectStatus(await admin.get('/api/admin/function-groups'), 200, 'GET /api/admin/function-groups').data;
    const keys = groups.map((group: { key: string }) => group.key);
    expect(keys).toEqual(expect.arrayContaining(['PROCESS_BUILDERS', 'PROCESS_AUDITORS', 'TECHNICAL_REVIEW']));
  });
});

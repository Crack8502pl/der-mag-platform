// R3 – Uprawnienia ról.
import { createUser, currentUserId, expectStatus, login, loginAdmin, unique } from './helpers';

describe('R3: uprawnienia ról', () => {
  it('viewer nie tworzy kontraktu (403), a /api/admin/* jest tylko dla admina', async () => {
    const admin = await loginAdmin();
    const viewer = await createUser(admin, 'viewer');
    const { session, response } = await login(viewer.username, viewer.password);
    expectStatus(response, 200, 'logowanie viewer');

    const contract = await session.post('/api/contracts', {
      customName: unique('Kontrakt viewer'),
      orderDate: new Date().toISOString().slice(0, 10),
      managerCode: 'REG',
      projectManagerId: await currentUserId(admin),
    });
    expect(contract.status).toBe(403);

    for (const path of ['/api/admin/users', '/api/admin/roles', '/api/admin/config/portal']) {
      expect({ path, status: (await session.get(path)).status }).toEqual({ path, status: 403 });
      expect({ path, status: (await admin.get(path)).status }).toEqual({ path, status: 200 });
    }
  });
});

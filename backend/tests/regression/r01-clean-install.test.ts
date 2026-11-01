// R1 – Instalacja od zera.
// Kody wyjścia dwóch uruchomień migrate-and-seed i liczności w SQL sprawdza workflow
// (.github/workflows/regression.yml, krok „R1”). Tu: skutek instalacji widoczny przez API.
import { expectStatus, loginAdmin } from './helpers';

describe('R1: instalacja od zera', () => {
  it('seeder utworzył admina, 10 ról i 13 typów zadań', async () => {
    const admin = await loginAdmin();

    const roles = expectStatus(await admin.get('/api/admin/roles'), 200, 'GET /api/admin/roles');
    expect((roles.data ?? roles)).toHaveLength(10);

    const taskTypes = expectStatus(await admin.get('/api/task-types'), 200, 'GET /api/task-types');
    expect(taskTypes.data).toHaveLength(13);

    const me = expectStatus(await admin.get('/api/auth/me'), 200, 'GET /api/auth/me');
    expect(JSON.stringify(me.data)).toContain('"admin"');
  });
});

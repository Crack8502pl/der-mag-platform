// R6 – Podgląd formularza: zwraca dane dla zadania i nie tworzy formularza w bazie.
import { createFormScenario, createTask, expectStatus } from './helpers';

describe('R6: podgląd formularza', () => {
  it('POST /api/forms/versions/:id/preview z zadaniem zwraca dane i nie tworzy formularza', async () => {
    const scenario = await createFormScenario();
    const { admin } = scenario;
    const task = await createTask(admin, { contractId: scenario.contract.id });

    const countInstances = async () =>
      expectStatus(await admin.get('/api/forms/instances?limit=1'), 200, 'GET /api/forms/instances').data.total as number;
    const before = await countInstances();

    const preview = expectStatus(await admin.post(`/api/forms/versions/${scenario.versionId}/preview`, { taskId: task.id }),
      200, 'POST /api/forms/versions/:id/preview').data;
    expect(preview.numer_zadania).toBe(task.taskNumber);
    expect(preview.numer_kontraktu).toBe(scenario.contract.contractNumber);
    expect(Array.isArray(preview.bom)).toBe(true);

    expect(await countInstances()).toBe(before);
  });
});

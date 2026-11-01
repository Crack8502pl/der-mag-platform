// R14 – Automatyzacje (W2a): łańcuch send_email na FORM_APPROVED, tryb testowy i run po akceptacji formularza.
import {
  createContract, createTask, currentUserId, expectStatus, firstTaskTypeId, loginAdmin, unique, ApiSession,
} from './helpers';

describe('R14: automatyzacje', () => {
  let admin: ApiSession;
  let versionId: number;
  let chainId: number;
  let taskId: number;
  let contractId: number;

  beforeAll(async () => {
    admin = await loginAdmin();
    const userId = await currentUserId(admin);
    const suffix = unique('r14');
    const contract = await createContract(admin);
    const task = await createTask(admin, { contractId: contract.id, taskTypeId: await firstTaskTypeId(admin) });
    taskId = task.id;
    contractId = contract.id;

    const template = expectStatus(await admin.post('/api/forms/templates', {
      key: suffix, name: `Automatyzacja ${suffix}`, procedureType: 'FIELD_INSTALLATION',
    }), 201, 'POST /api/forms/templates').data;
    const draft = expectStatus(await admin.post(`/api/forms/templates/${template.id}/draft`, {}), 201, 'POST draft').data;
    versionId = draft.id;
    expectStatus(await admin.put(`/api/forms/versions/${versionId}/draft`, {
      title: 'Formularz automatyzacji',
      sections: [{
        key: 'uwagi', title: 'Uwagi', sortOrder: 1,
        fields: [{ key: 'opis', label: 'Opis prac', fieldType: 'TEXTAREA', sortOrder: 1 }],
      }],
    }), 200, 'PUT draft');

    const chain = expectStatus(await admin.put(
      `/api/automation/chains?ownerType=FORM_TEMPLATE_VERSION&ownerId=${versionId}&eventType=FORM_APPROVED`,
      {
        onError: 'STOP',
        steps: [{
          action: 'send_email',
          params: { recipientType: 'user', user: userId, subject: 'Zatwierdzono {task.number}', body: 'Formularz zadania {task.number} został zatwierdzony.' },
        }],
      },
    ), 200, 'PUT /api/automation/chains').data;
    chainId = chain.id;
  });

  it('katalog klocków zawiera send_email', async () => {
    const actions = expectStatus(await admin.get('/api/automation/actions'), 200, 'GET /api/automation/actions').data;
    expect(actions.map((action: { key: string }) => action.key)).toContain('send_email');
  });

  it('nieznana zmienna w treści jest odrzucana (400)', async () => {
    const response = await admin.put(
      `/api/automation/chains?ownerType=FORM_TEMPLATE_VERSION&ownerId=${versionId}&eventType=FORM_SUBMITTED`,
      { onError: 'STOP', steps: [{ action: 'send_email', params: { recipientType: 'assignee', subject: '{nieznana.zmienna}', body: 'x' } }] },
    );
    expect(response.status).toBe(400);
  });

  it('tryb testowy zwraca OK i zapisuje run z dry_run = true', async () => {
    const run = expectStatus(await admin.post(`/api/automation/chains/${chainId}/test`, { taskId }), 200, 'POST /chains/:id/test').data;
    expect(run.dryRun).toBe(true);
    expect(run.steps[0].status).toBe('SUCCEEDED');
  });

  it('po akceptacji formularza w bazie jest run SUCCEEDED', async () => {
    expectStatus(await admin.post(`/api/forms/versions/${versionId}/publish`, {}), 200, 'publish');
    const instance = expectStatus(await admin.post('/api/forms/instances', {
      templateVersionId: versionId, taskId, contractId,
    }), 201, 'POST /api/forms/instances').data;
    expectStatus(await admin.post(`/api/forms/instances/${instance.id}/complete`, {}), 200, 'complete');
    expectStatus(await admin.post(`/api/forms/instances/${instance.id}/approve`, { comment: 'Test regresji R14' }), 200, 'approve');

    let runs: Array<{ status: string; dryRun: boolean }> = [];
    for (let attempt = 0; attempt < 30; attempt += 1) {
      runs = expectStatus(await admin.get(`/api/automation/runs?ownerType=FORM_TEMPLATE_VERSION&ownerId=${versionId}`),
        200, 'GET /api/automation/runs').data.filter((run: { dryRun: boolean }) => !run.dryRun);
      if (runs.some(run => run.status === 'SUCCEEDED')) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe('SUCCEEDED');
  });
});

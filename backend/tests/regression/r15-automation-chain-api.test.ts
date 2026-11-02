// R15 – Pole „Automatyzacje” w edytorze formularzy (W2b): przez API to samo, co robi interfejs –
// zapis łańcucha z 2 krokami dla wersji formularza i odczyt w tej samej kolejności.
import {
  createContract, createTask, currentUserId, expectStatus, firstTaskTypeId, loginAdmin, unique, ApiSession,
} from './helpers';

interface StepDto { action: string; params: Record<string, unknown> }
interface RunDto { id: number; status: string; dryRun: boolean; event: { payload?: { instanceId?: number } }; steps: Array<{ action: string; status: string; message: string }> }

const OWNER = 'ownerType=FORM_TEMPLATE_VERSION';

describe('R15: pole „Automatyzacje” w edytorze formularzy', () => {
  let admin: ApiSession;
  let userId: number;
  let templateId: number;
  let versionId: number;
  let contractId: number;
  let taskId: number;

  const chainUrl = (ownerId: number, eventType: string) => `/api/automation/chains?${OWNER}&ownerId=${ownerId}&eventType=${eventType}`;
  const pdfStep = (): StepDto => ({ action: 'generate_form_pdf', params: {} });
  const emailStep = (): StepDto => ({
    action: 'send_email',
    params: { recipientType: 'user', user: userId, subject: 'Zatwierdzono {task.number}', body: 'Formularz zadania {task.number} został zatwierdzony.' },
  });

  async function savedActions(ownerId: number, eventType: string): Promise<string[] | null> {
    const chain = expectStatus(await admin.get(chainUrl(ownerId, eventType)), 200, 'GET /api/automation/chains').data;
    return chain ? chain.steps.map((step: StepDto) => step.action) : null;
  }

  async function runsOf(instanceId?: number): Promise<RunDto[]> {
    const filter = instanceId === undefined ? '' : `&instanceId=${instanceId}`;
    const runs: RunDto[] = expectStatus(await admin.get(`/api/automation/runs?${OWNER}&ownerId=${versionId}${filter}`),
      200, 'GET /api/automation/runs').data;
    return runs.filter(run => !run.dryRun);
  }

  async function waitForFinishedRuns(instanceId: number): Promise<RunDto[]> {
    let runs: RunDto[] = [];
    for (let attempt = 0; attempt < 30; attempt += 1) {
      runs = await runsOf(instanceId);
      if (runs.length === 1 && runs[0].status !== 'RUNNING') break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return runs;
  }

  async function approvedInstance(forTaskId: number): Promise<number> {
    const instance = expectStatus(await admin.post('/api/forms/instances', {
      templateVersionId: versionId, taskId: forTaskId, contractId,
    }), 201, 'POST /api/forms/instances').data;
    expectStatus(await admin.post(`/api/forms/instances/${instance.id}/complete`, {}), 200, 'complete');
    expectStatus(await admin.post(`/api/forms/instances/${instance.id}/approve`, { comment: 'Test regresji R15' }), 200, 'approve');
    return instance.id;
  }

  beforeAll(async () => {
    admin = await loginAdmin();
    userId = await currentUserId(admin);
    const suffix = unique('r15');
    const contract = await createContract(admin);
    contractId = contract.id;
    taskId = (await createTask(admin, { contractId, taskTypeId: await firstTaskTypeId(admin) })).id;

    const template = expectStatus(await admin.post('/api/forms/templates', {
      key: suffix, name: `Pole automatyzacji ${suffix}`, procedureType: 'FIELD_INSTALLATION',
    }), 201, 'POST /api/forms/templates').data;
    templateId = template.id;
    const draft = expectStatus(await admin.post(`/api/forms/templates/${templateId}/draft`, {}), 201, 'POST draft').data;
    versionId = draft.id;
    expectStatus(await admin.put(`/api/forms/versions/${versionId}/draft`, {
      title: 'Formularz z automatyzacjami',
      sections: [{
        key: 'uwagi', title: 'Uwagi', sortOrder: 1,
        fields: [{ key: 'opis', label: 'Opis prac', fieldType: 'TEXTAREA', sortOrder: 1 }],
      }],
    }), 200, 'PUT draft');
  });

  it('zapisuje łańcuch z 2 krokami dla wersji formularza i odczytuje go w tej samej kolejności', async () => {
    expect(await savedActions(versionId, 'FORM_APPROVED')).toBeNull();

    const saved = expectStatus(await admin.put(chainUrl(versionId, 'FORM_APPROVED'), {
      onError: 'CONTINUE', steps: [pdfStep(), emailStep()],
    }), 200, 'PUT /api/automation/chains').data;
    expect(saved.steps.map((step: StepDto) => step.action)).toEqual(['generate_form_pdf', 'send_email']);

    const read = expectStatus(await admin.get(chainUrl(versionId, 'FORM_APPROVED')), 200, 'GET /api/automation/chains').data;
    expect(read.id).toBe(saved.id);
    expect(read.onError).toBe('CONTINUE');
    expect(read.steps.map((step: StepDto) => step.action)).toEqual(['generate_form_pdf', 'send_email']);
    expect(read.steps[1].params).toMatchObject({ recipientType: 'user', user: userId, subject: 'Zatwierdzono {task.number}' });
  });

  it('przeciągnięcie kroku zmienia zapisaną kolejność w tym samym łańcuchu', async () => {
    const before = expectStatus(await admin.get(chainUrl(versionId, 'FORM_APPROVED')), 200, 'GET chain').data;
    const saved = expectStatus(await admin.put(chainUrl(versionId, 'FORM_APPROVED'), {
      onError: 'CONTINUE', steps: [emailStep(), pdfStep()],
    }), 200, 'PUT chain').data;

    expect(saved.id).toBe(before.id);
    expect(await savedActions(versionId, 'FORM_APPROVED')).toEqual(['send_email', 'generate_form_pdf']);
  });

  it('„Po zatwierdzeniu” i „Po odrzuceniu” to niezależne łańcuchy', async () => {
    expect(await savedActions(versionId, 'FORM_REJECTED')).toBeNull();
    expectStatus(await admin.put(chainUrl(versionId, 'FORM_REJECTED'), { onError: 'STOP', steps: [emailStep()] }), 200, 'PUT FORM_REJECTED');

    expect(await savedActions(versionId, 'FORM_REJECTED')).toEqual(['send_email']);
    expect(await savedActions(versionId, 'FORM_APPROVED')).toEqual(['send_email', 'generate_form_pdf']);
  });

  it('krok bez wymaganego ustawienia jest odrzucany (400) ze wskazaniem kroku, a zapis się nie zmienia', async () => {
    const response = await admin.put(chainUrl(versionId, 'FORM_APPROVED'), {
      onError: 'STOP',
      steps: [pdfStep(), { action: 'send_email', params: { recipientType: 'assignee', subject: 'Temat' } }],
    });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(response.body.details).toEqual([expect.objectContaining({ stepIndex: 1 })]);

    const noPerson = await admin.put(chainUrl(versionId, 'FORM_APPROVED'), {
      onError: 'STOP',
      steps: [{ action: 'send_email', params: { recipientType: 'user', subject: 'Temat', body: 'Treść' } }],
    });
    expect(noPerson.status).toBe(400);
    expect(noPerson.body.details).toEqual([expect.objectContaining({ stepIndex: 0 })]);

    expect(await savedActions(versionId, 'FORM_APPROVED')).toEqual(['send_email', 'generate_form_pdf']);
  });

  it('katalog klocków opisuje, które ustawienia dotyczą którego odbiorcy', async () => {
    const actions = expectStatus(await admin.get('/api/automation/actions'), 200, 'GET /api/automation/actions').data;
    const email = actions.find((action: { key: string }) => action.key === 'send_email');
    const person = email.params.find((param: { key: string }) => param.key === 'user');
    const role = email.params.find((param: { key: string }) => param.key === 'role');

    expect(person.showWhen).toEqual({ param: 'recipientType', equals: 'user' });
    expect(role.showWhen).toEqual({ param: 'recipientType', equals: 'role' });
  });

  it('test na zadaniu zwraca wyniki kroków w kolejności łańcucha, z komunikatami po polsku', async () => {
    const chain = expectStatus(await admin.get(chainUrl(versionId, 'FORM_APPROVED')), 200, 'GET chain').data;
    const run = expectStatus(await admin.post(`/api/automation/chains/${chain.id}/test`, { taskId }), 200, 'POST /chains/:id/test').data;

    expect(run.dryRun).toBe(true);
    expect(run.steps.map((step: RunDto['steps'][number]) => step.action)).toEqual(['send_email', 'generate_form_pdf']);
    expect(run.steps[0].status).toBe('SUCCEEDED');
    expect(['SUCCEEDED', 'SKIPPED']).toContain(run.steps[1].status);
    for (const step of run.steps) expect(step.message).toMatch(/\S/);
  });

  it('listy wyboru ustawień zwracają nazwy zamiast kluczy technicznych', async () => {
    const options = async (query: string) => expectStatus(await admin.get(`/api/automation/lookups?${query}`),
      200, `GET /api/automation/lookups?${query}`).data as Array<{ value: number | string; label: string }>;

    const users = await options('type=user&search=admin');
    expect(users.find(option => option.value === userId)?.label).toMatch(/admin/i);

    const roles = await options('type=role');
    expect(roles.length).toBeGreaterThan(0);
    expect(roles.every(option => typeof option.value === 'number' && option.label.trim() !== '')).toBe(true);

    const groups = await options('type=functionGroup&search=procesow');
    expect(groups).toContainEqual({ value: 'PROCESS_AUDITORS', label: 'Audytorzy procesów' });

    expect((await options('type=taskType')).length).toBeGreaterThan(0);

    const invalid = await admin.get('/api/automation/lookups?type=unknown');
    expect(invalid.status).toBe(400);
  });

  it('uruchomienia po akceptacji można odfiltrować po wypełnionym formularzu', async () => {
    expectStatus(await admin.put(chainUrl(versionId, 'FORM_APPROVED'), { onError: 'STOP', steps: [emailStep()] }), 200, 'PUT chain');
    expectStatus(await admin.post(`/api/forms/versions/${versionId}/publish`, {}), 200, 'publish');

    const otherTask = await createTask(admin, { contractId, taskTypeId: await firstTaskTypeId(admin) });
    const firstInstance = await approvedInstance(taskId);
    const secondInstance = await approvedInstance(otherTask.id);

    const firstRuns = await waitForFinishedRuns(firstInstance);
    const secondRuns = await waitForFinishedRuns(secondInstance);
    expect(firstRuns).toHaveLength(1);
    expect(firstRuns[0]).toMatchObject({ status: 'SUCCEEDED', event: { payload: { instanceId: firstInstance } } });
    expect(firstRuns[0].steps.map(step => step.action)).toEqual(['send_email']);
    expect(secondRuns).toHaveLength(1);
    expect(secondRuns[0].event.payload?.instanceId).toBe(secondInstance);
    expect(await runsOf()).toHaveLength(2);

    const invalid = await admin.get(`/api/automation/runs?${OWNER}&ownerId=${versionId}&instanceId=abc`);
    expect(invalid.status).toBe(400);
  });

  it('łańcuch opublikowanej wersji jest tylko do odczytu, a nowa wersja dostaje jego kopię do edycji', async () => {
    const response = await admin.put(chainUrl(versionId, 'FORM_APPROVED'), { onError: 'STOP', steps: [pdfStep(), emailStep()] });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('CHAIN_IMMUTABLE');
    expect(await savedActions(versionId, 'FORM_APPROVED')).toEqual(['send_email']);

    const next = expectStatus(await admin.post(`/api/forms/templates/${templateId}/draft`, {}), 201, 'POST nowa wersja robocza').data;
    expect(await savedActions(next.id, 'FORM_APPROVED')).toEqual(['send_email']);
    expectStatus(await admin.put(chainUrl(next.id, 'FORM_APPROVED'), { onError: 'STOP', steps: [pdfStep(), emailStep()] }), 200, 'PUT nowa wersja');
    expect(await savedActions(next.id, 'FORM_APPROVED')).toEqual(['generate_form_pdf', 'send_email']);
    expect(await savedActions(versionId, 'FORM_APPROVED')).toEqual(['send_email']);
  });
});

// R16 – Definicja procesu z wersjami (W3a): przez API proces 3-etapowy z regułą powrotu – walidacja bez błędów,
// publikacja, druga wersja (kopia etapów, przejść i łańcuchów), publikacja drugiej, a pierwsza SUPERSEDED.
// Zła definicja zwraca wszystkie błędy naraz, po polsku. Proces dla SSP: pominięcie audytu celowości tylko z uzasadnieniem.
import { createUser, currentUserId, expectStatus, login, loginAdmin, roleIdByName, unique, ApiSession } from './helpers';

interface TaskTypeDto { id: number; code: string; safetyCritical: boolean }
interface ChainDto { eventType: string; steps: Array<{ action: string }> }
interface StepDto { id: number; key: string; name: string; assigneeType: string; assigneeRef: string | null; formTemplateId: number | null; chains: ChainDto[] }
interface TransitionDto { fromStepKey: string; toStepKey: string; condition: unknown; priority: number }
interface VersionDto { id: number; version: number; status: string; editable: boolean; safetyCritical: boolean; allowSkipPurposeAudit: boolean; steps: StepDto[]; transitions: TransitionDto[] }
interface IssueDto { code: string; message: string }

const RETURN_CONDITION = { field: 'obraz', operator: 'equals', value: 'NIE_OK' };
const SAFETY_WARNING = 'Proces dotyczy systemu krytycznego dla bezpieczeństwa (SSP/SUG). Pominięcie audytu celowości jest odradzane.';

describe('R16: definicja procesu z wersjami (W3a)', () => {
  let admin: ApiSession;
  let userId: number;
  let adminRoleId: number;
  let formTemplateId: number;
  let formName: string;
  let taskTypes: TaskTypeDto[];

  const typeId = (code: string): number => {
    const type = taskTypes.find(item => item.code === code);
    if (!type) throw new Error(`Brak typu zadania ${code}`);
    return type.id;
  };

  async function createDefinition(name: string, taskTypeIds: number[]) {
    return expectStatus(await admin.post('/api/workflows', {
      name: `${name} ${unique('r16')}`, description: 'Proces testu regresji R16', subjectType: 'TASK', taskTypeIds,
    }), 201, 'POST /api/workflows').data;
  }

  const threeSteps = () => ({
    steps: [
      { key: 'montaz', name: 'Montaż', assigneeType: 'SUBJECT_ASSIGNEE', dueInHours: 48 },
      { key: 'weryfikacja', name: 'Weryfikacja obrazu', assigneeType: 'FUNCTION_GROUP', assigneeRef: 'TECHNICAL_REVIEW', formTemplateId },
      { key: 'odbior', name: 'Odbiór', assigneeType: 'ROLE', assigneeRef: adminRoleId },
    ],
    // Reguła powrotu: obraz NIE OK → z powrotem do montażu; w pozostałych przypadkach kolejny etap.
    transitions: [{ fromStepKey: 'weryfikacja', toStepKey: 'montaz', condition: RETURN_CONDITION, priority: 1 }],
  });

  const chainUrl = (stepId: number) => `/api/automation/chains?ownerType=WORKFLOW_STEP&ownerId=${stepId}&eventType=STEP_ENTERED`;

  beforeAll(async () => {
    admin = await loginAdmin();
    userId = await currentUserId(admin);
    adminRoleId = await roleIdByName(admin, 'admin');
    taskTypes = expectStatus(await admin.get('/api/admin/task-types'), 200, 'GET /api/admin/task-types').data;

    const suffix = unique('r16');
    const template = expectStatus(await admin.post('/api/forms/templates', {
      key: suffix, name: `Weryfikacja obrazu ${suffix}`, procedureType: 'FIELD_INSTALLATION',
    }), 201, 'POST /api/forms/templates').data;
    const draft = expectStatus(await admin.post(`/api/forms/templates/${template.id}/draft`, {}), 201, 'POST draft formularza').data;
    expectStatus(await admin.put(`/api/forms/versions/${draft.id}/draft`, {
      title: 'Weryfikacja obrazu kamer',
      sections: [{
        key: 'ocena', title: 'Ocena obrazu', sortOrder: 1,
        fields: [{ key: 'obraz', label: 'Obraz', fieldType: 'RADIO', required: true, sortOrder: 1, options: { values: ['OK', 'NIE_OK'] } }],
      }],
    }), 200, 'PUT /api/forms/versions/:id/draft');
    expectStatus(await admin.post(`/api/forms/versions/${draft.id}/publish`, {}), 200, 'POST /api/forms/versions/:id/publish');
    formTemplateId = template.id;
    formName = template.name;
  });

  it('SSP i SUG są oznaczone jako krytyczne dla bezpieczeństwa, pozostałe typy zadań nie', () => {
    expect(taskTypes.filter(type => type.safetyCritical).map(type => type.code).sort()).toEqual(['SSP', 'SUG']);
    expect(taskTypes.filter(type => !['SSP', 'SUG'].includes(type.code))
      .every(type => type.safetyCritical === false)).toBe(true);
  });

  it('istniejące role nie otrzymały uprawnień workflow; admin zachowuje dostęp przez all', async () => {
    const roles = expectStatus(await admin.get('/api/admin/roles'), 200, 'GET /api/admin/roles').data;
    expect(roles).toHaveLength(10);
    expect(roles.find((role: { name: string }) => role.name === 'admin').permissions).toEqual({ all: true });
    for (const role of roles.filter((item: { name: string }) => item.name !== 'admin')) {
      expect(role.permissions.workflow).toBeUndefined();
    }
  });

  it('proces 3-etapowy z regułą powrotu: walidacja OK, publikacja, druga wersja, pierwsza SUPERSEDED', async () => {
    const definition = await createDefinition('Montaż kamer', [typeId('SMW')]);
    expect(definition.key).toMatch(/^montaz_kamer_r16/);
    expect(definition.draftVersion).toMatchObject({ version: 1, status: 'DRAFT', safetyCritical: false, allowSkipPurposeAudit: true });
    const v1Id: number = definition.draftVersion.id;

    const saved: VersionDto = expectStatus(await admin.put(`/api/workflows/versions/${v1Id}`, threeSteps()), 200,
      'PUT /api/workflows/versions/:id').data;
    expect(saved.steps.map(step => step.key)).toEqual(['montaz', 'weryfikacja', 'odbior']);
    expect(saved.transitions).toEqual([expect.objectContaining({ fromStepKey: 'weryfikacja', toStepKey: 'montaz', condition: RETURN_CONDITION })]);

    // Łańcuch automatyzacji etapu „Montaż” – po „Nowej wersji” ma być skopiowany.
    const montaz = saved.steps[0];
    expectStatus(await admin.put(chainUrl(montaz.id), {
      onError: 'STOP',
      steps: [{ action: 'send_email', params: { recipientType: 'user', user: userId, subject: 'Etap montażu', body: 'Rozpoczęto etap montażu.' } }],
    }), 200, 'PUT /api/automation/chains (WORKFLOW_STEP)');

    const check = expectStatus(await admin.post(`/api/workflows/versions/${v1Id}/validate`, {}), 200, 'POST validate').data;
    expect(check).toEqual({ valid: true, issues: [] });

    const published = expectStatus(await admin.post(`/api/workflows/versions/${v1Id}/publish`, {}), 200, 'POST publish v1').data;
    expect(published).toMatchObject({ id: v1Id, version: 1, status: 'PUBLISHED', editable: false, supersededVersionId: null });

    // Wersja opublikowana jest niezmienna – także jej łańcuchy.
    const locked = await admin.put(`/api/workflows/versions/${v1Id}`, { steps: [] });
    expect(locked.status).toBe(409);
    expect(locked.body.message).toBe('Wersja 1 jest opublikowana i nie można jej zmieniać. Utwórz nową wersję.');
    expect((await admin.put(chainUrl(montaz.id), { onError: 'STOP', steps: [] })).status).toBe(409);

    const v2: VersionDto = expectStatus(await admin.post(`/api/workflows/versions/${v1Id}/next-version`, {}), 201, 'POST next-version').data;
    expect(v2).toMatchObject({ version: 2, status: 'DRAFT', editable: true });
    expect(v2.steps.map(step => [step.key, step.assigneeType, step.formTemplateId]))
      .toEqual(saved.steps.map(step => [step.key, step.assigneeType, step.formTemplateId]));
    expect(v2.steps.map(step => step.id)).not.toEqual(saved.steps.map(step => step.id));
    expect(v2.transitions).toEqual([expect.objectContaining({ fromStepKey: 'weryfikacja', toStepKey: 'montaz', condition: RETURN_CONDITION })]);
    expect(v2.steps[0].chains).toEqual([expect.objectContaining({ eventType: 'STEP_ENTERED', steps: [expect.objectContaining({ action: 'send_email' })] })]);

    expectStatus(await admin.put(`/api/workflows/versions/${v2.id}`, {
      steps: v2.steps.map(step => ({ id: step.id, key: step.key, name: step.name, assigneeType: step.assigneeType, assigneeRef: step.assigneeRef, formTemplateId: step.formTemplateId, dueInHours: 24 })),
    }), 200, 'PUT v2');
    const second = expectStatus(await admin.post(`/api/workflows/versions/${v2.id}/publish`, {}), 200, 'POST publish v2').data;
    expect(second).toMatchObject({ version: 2, status: 'PUBLISHED', supersededVersionId: v1Id });

    const versions = expectStatus(await admin.get(`/api/workflows/${definition.id}/versions`), 200, 'GET versions').data;
    expect(versions.map((version: VersionDto) => [version.version, version.status])).toEqual([[2, 'PUBLISHED'], [1, 'SUPERSEDED']]);
    const old = await admin.put(`/api/workflows/versions/${v1Id}`, { steps: [] });
    expect(old.status).toBe(409);
    expect(old.body.message).toBe('Wersja 1 została zastąpiona nowszą i nie można jej zmieniać.');
  });

  it('zła definicja zwraca wszystkie błędy naraz, po polsku, i nie zostaje opublikowana', async () => {
    const definition = await createDefinition('Zła definicja', [typeId('SMW')]);
    const versionId: number = definition.draftVersion.id;
    expectStatus(await admin.put(`/api/workflows/versions/${versionId}`, {
      steps: [
        { key: 'start', name: 'Start', assigneeType: 'SUBJECT_ASSIGNEE' },
        { key: 'petla', name: 'Pętla', assigneeType: 'ROLE', assigneeRef: 2147483647 },
        { key: 'petla', name: 'Pętla bis', assigneeType: 'SUBJECT_ASSIGNEE', formTemplateId: 2147483647 },
        { key: 'sprawdzenie', name: 'Sprawdzenie', assigneeType: 'FUNCTION_GROUP', assigneeRef: 'NIE_MA_TAKIEJ_FUNKCJI', formTemplateId },
      ],
      transitions: [
        // Do nieistniejącego etapu; potem bezwarunkowo z pominięciem „Pętli” (nieosiągalna).
        { fromStepKey: 'start', toStepKey: 'koniec', condition: null, priority: 1 },
        { fromStepKey: 'start', toStepKey: 'sprawdzenie', condition: null, priority: 2 },
        // Warunek na polu spoza formularza etapu i pętla bez wyjścia (brak drogi do końca).
        { fromStepKey: 'sprawdzenie', toStepKey: 'sprawdzenie', condition: { field: 'nie_ma_pola', operator: 'equals', value: 'X' }, priority: 1 },
        { fromStepKey: 'sprawdzenie', toStepKey: 'sprawdzenie', condition: null, priority: 2 },
      ],
      reviewConfig: { purpose: { functionKey: 'NIE_MA_AUDYTOROW', minApprovals: 1 }, technical: { functionKey: 'TECHNICAL_REVIEW', minApprovals: 1 } },
    }), 200, 'PUT złej definicji');

    const check = expectStatus(await admin.post(`/api/workflows/versions/${versionId}/validate`, {}), 200, 'POST validate').data;
    expect(check.valid).toBe(false);
    const codes = check.issues.map((issue: IssueDto) => issue.code);
    expect(codes).toEqual([
      'DUPLICATE_STEP_KEY',
      'ASSIGNEE_NOT_FOUND', 'FORM_NOT_FOUND', 'ASSIGNEE_NOT_FOUND',
      'TRANSITION_UNKNOWN_STEP', 'CONDITION_UNKNOWN_FIELD',
      'NO_PATH_TO_END', 'STEP_UNREACHABLE', 'NO_PATH_TO_END', 'NO_PATH_TO_END',
      'REVIEW_FUNCTION_NOT_FOUND',
    ]);
    expect(check.issues.map((issue: IssueDto) => issue.message)).toEqual([
      'Etapy „Pętla”, „Pętla bis” mają ten sam identyfikator „petla” – każdy etap musi mieć własny.',
      'Etap „Pętla”: wybrana rola nie istnieje.',
      'Etap „Pętla bis”: wybrany formularz nie istnieje.',
      'Etap „Sprawdzenie”: wybrana funkcja nie istnieje.',
      'Reguła przejścia nr 1 prowadzi do etapu „koniec”, którego nie ma w procesie.',
      'Warunek reguły przejścia z „Sprawdzenie” do „Sprawdzenie” odnosi się do pola „nie_ma_pola”, którego nie ma w formularzu '
        + `„${formName}” etapu „Sprawdzenie”.`,
      'Z etapu „Start” nie da się dojść do końca procesu – reguły przejść tworzą pętlę bez wyjścia.',
      'Etap „Pętla” jest nieosiągalny – nie prowadzi do niego żadna droga od pierwszego etapu „Start”.',
      'Z etapu „Pętla” nie da się dojść do końca procesu – reguły przejść tworzą pętlę bez wyjścia.',
      'Z etapu „Sprawdzenie” nie da się dojść do końca procesu – reguły przejść tworzą pętlę bez wyjścia.',
      'Audyt celowości: funkcja „NIE_MA_AUDYTOROW” nie istnieje.',
    ]);

    const publish = await admin.post(`/api/workflows/versions/${versionId}/publish`, {});
    expect(publish.status).toBe(400);
    expect(publish.body.code).toBe('DEFINITION_INVALID');
    expect(publish.body.message).toBe(`Nie można opublikować procesu – popraw błędy (${check.issues.length}).`);
    expect(publish.body.issues).toEqual(check.issues);
    const after = expectStatus(await admin.get(`/api/workflows/versions/${versionId}`), 200, 'GET version').data;
    expect(after.status).toBe('DRAFT');

    const zero = await admin.put(`/api/workflows/versions/${versionId}`, {
      reviewConfig: { purpose: { functionKey: 'PROCESS_AUDITORS', minApprovals: 0 }, technical: { functionKey: 'TECHNICAL_REVIEW', minApprovals: 1 } },
    });
    expect(zero.status).toBe(400);
    expect(zero.body.message).toContain('Audyt celowości: minimalna liczba akceptacji musi wynosić co najmniej 1.');
  });

  it('proces dla SSP: pominięcie audytu celowości domyślnie wyłączone, włączenie tylko z uzasadnieniem i z ostrzeżeniem', async () => {
    const definition = await createDefinition('Przegląd SSP', [typeId('SSP')]);
    expect(definition.safetyCritical).toBe(true);
    expect(definition.draftVersion).toMatchObject({ safetyCritical: true, allowSkipPurposeAudit: false });
    const versionId: number = definition.draftVersion.id;

    const refused = await admin.put(`/api/workflows/versions/${versionId}`, { allowSkipPurposeAudit: true });
    expect(refused.status).toBe(400);
    expect(refused.body.issues).toEqual([expect.objectContaining({ field: 'skipJustification' })]);

    const accepted = await admin.put(`/api/workflows/versions/${versionId}`, {
      allowSkipPurposeAudit: true,
      skipJustification: 'Proces testowy regresji – bez wpływu na instalacje SSP.',
    });
    const body = expectStatus(accepted, 200, 'PUT z uzasadnieniem');
    expect(body.warning).toBe(SAFETY_WARNING);
    expect(body.data).toMatchObject({ safetyCritical: true, allowSkipPurposeAudit: true });
  });

  it('przełącznik „Krytyczny dla bezpieczeństwa” w typach zadań przelicza wersje robocze procesów', async () => {
    const skdId = typeId('SKD');
    const definition = await createDefinition('Kontrola dostępu', [skdId]);
    expect(definition.draftVersion).toMatchObject({ safetyCritical: false, allowSkipPurposeAudit: true });
    try {
      const enabled = expectStatus(await admin.request('PATCH', `/api/admin/task-types/${skdId}`, { json: { safetyCritical: true } }),
        200, 'PATCH /api/admin/task-types/:id (włączenie)');
      expect(enabled.data).toMatchObject({ id: skdId, code: 'SKD', safetyCritical: true });
      expect(enabled.refreshedDrafts).toBeGreaterThanOrEqual(1);
      const critical = expectStatus(await admin.get(`/api/workflows/${definition.id}`), 200, 'GET /api/workflows/:id').data;
      expect(critical.draftVersion).toMatchObject({ safetyCritical: true, allowSkipPurposeAudit: false });
    } finally {
      expectStatus(await admin.request('PATCH', `/api/admin/task-types/${skdId}`, { json: { safetyCritical: false } }),
        200, 'PATCH /api/admin/task-types/:id (przywrócenie)');
    }
    const restored = expectStatus(await admin.get(`/api/workflows/${definition.id}`), 200, 'GET /api/workflows/:id').data;
    expect(restored.draftVersion).toMatchObject({ safetyCritical: false, allowSkipPurposeAudit: false });
  });

  it('bez uprawnień workflow.read / workflow.build: 403; przełącznik typów zadań tylko dla admina', async () => {
    const viewer = await createUser(admin, 'viewer');
    const { session, response } = await login(viewer.username, viewer.password);
    expectStatus(response, 200, 'logowanie viewer');

    expect((await session.get('/api/workflows')).status).toBe(403);
    expect((await session.post('/api/workflows', { name: 'Proces bez uprawnień', subjectType: 'TASK' })).status).toBe(403);
    expect((await session.get('/api/admin/task-types')).status).toBe(403);
  });
});

// R17 – Realizacja procesu: zadanie, powrót po FAIL, ukończenie i pełna historia czterech podejść.
import {
  ApiSession, createTask, currentUserId, expectStatus, firstTaskTypeId, loginAdmin, unique,
} from './helpers';

interface StepRunDto {
  id: number;
  stepKey: string;
  attempt: number;
  formInstanceId: number | null;
  formTemplateVersionId: number | null;
  outcome: string | null;
}

interface WorkflowInstanceDto {
  id: number;
  versionId: number;
  status: string;
  currentStepKey: string | null;
  history: StepRunDto[];
}

describe('R17: realizacja procesu z powrotem (W3b)', () => {
  let admin: ApiSession;
  let definitionId: number;
  let versionId: number;
  let formVersionId: number;
  let taskId: number;
  let userId: number;

  beforeAll(async () => {
    admin = await loginAdmin();
    userId = await currentUserId(admin);
    const taskTypeId = await firstTaskTypeId(admin);
    taskId = (await createTask(admin, { taskTypeId })).id;
    const suffix = unique('r17');
    const template = expectStatus(await admin.post('/api/forms/templates', {
      key: suffix, name: `Kontrola ${suffix}`, procedureType: 'FIELD_INSTALLATION',
    }), 201, 'utworzenie szablonu kontroli').data;
    const formDraft = expectStatus(await admin.post(`/api/forms/templates/${template.id}/draft`, {}),
      201, 'wersja robocza formularza').data;
    formVersionId = formDraft.id;
    expectStatus(await admin.put(`/api/forms/versions/${formVersionId}/draft`, {
      title: 'Wynik kontroli',
      sections: [{
        key: 'kontrola', title: 'Kontrola', sortOrder: 1,
        // PASS_FAIL blokuje zakończenie przy FAIL; tu wynik służy wyłącznie do wyboru przejścia.
        fields: [{
          key: 'wynik', label: 'Wynik kontroli', fieldType: 'RADIO', required: true,
          sortOrder: 1, options: { values: ['PASS', 'FAIL'] },
        }],
      }],
    }), 200, 'zapis formularza kontroli');
    expectStatus(await admin.post(`/api/forms/versions/${formVersionId}/publish`, {}),
      200, 'publikacja formularza');

    const definition = expectStatus(await admin.post('/api/workflows', {
      name: `Realizacja ${suffix}`, subjectType: 'TASK', taskTypeIds: [taskTypeId],
    }), 201, 'utworzenie definicji procesu').data;
    definitionId = definition.id;
    versionId = definition.draftVersion.id;
    expectStatus(await admin.put(`/api/workflows/versions/${versionId}`, {
      steps: [
        { key: 'montaz', name: 'Montaż', assigneeType: 'USER', assigneeRef: userId, dueInHours: 24 },
        { key: 'kontrola', name: 'Kontrola', assigneeType: 'USER', assigneeRef: userId, formTemplateId: template.id },
      ],
      transitions: [{
        fromStepKey: 'kontrola', toStepKey: 'montaz', priority: 1,
        condition: { field: 'wynik', operator: 'equals', value: 'FAIL' },
      }],
    }), 200, 'zapis etapów i reguły powrotu');
    expectStatus(await admin.post(`/api/workflows/versions/${versionId}/publish`, {}),
      200, 'publikacja procesu');
  });

  it('start dla zadania, FAIL → powrót, PASS → koniec; wersja przypięta i historia 4 step_runów', async () => {
    const start = () => admin.post('/api/workflow-instances', { definitionId, subjectType: 'TASK', subjectId: taskId });
    const instance: WorkflowInstanceDto = expectStatus(await start(), 201, 'start realizacji').data;
    expect(instance).toMatchObject({ versionId, status: 'RUNNING', currentStepKey: 'montaz' });
    expect((await start()).status).toBe(409);
    const detail = async (): Promise<WorkflowInstanceDto> =>
      expectStatus(await admin.get(`/api/workflow-instances/${instance.id}`), 200, 'historia realizacji').data;
    const complete = () => admin.post(`/api/workflow-instances/${instance.id}/steps/current/complete`, {});
    const submit = async (result: 'PASS' | 'FAIL') => {
      const current = (await detail()).history.find(run => run.outcome === null)!;
      expect(current.formTemplateVersionId).toBe(formVersionId);
      expectStatus(await admin.put(`/api/forms/instances/${current.formInstanceId}/values`, {
        responses: { wynik: result },
      }), 200, `zapis wyniku ${result}`);
      expectStatus(await admin.post(`/api/forms/instances/${current.formInstanceId}/complete`, {}),
        200, 'zakończenie formularza kontroli');
    };

    // Publikacja następnej wersji nie zmienia rozpoczętej realizacji.
    const next = expectStatus(await admin.post(`/api/workflows/versions/${versionId}/next-version`, {}),
      201, 'nowa wersja procesu').data;
    expectStatus(await admin.put(`/api/workflows/versions/${next.id}`, {
      steps: [{ key: 'nowy', name: 'Nowy przebieg', assigneeType: 'USER', assigneeRef: userId }],
      transitions: [],
    }), 200, 'zmiana przebiegu nowej wersji');
    expectStatus(await admin.post(`/api/workflows/versions/${next.id}/publish`, {}),
      200, 'publikacja nowej wersji');

    expectStatus(await complete(), 200, 'zakończenie pierwszego montażu');
    expect((await complete()).status).toBe(409);
    await submit('FAIL');
    expectStatus(await complete(), 200, 'powrót po FAIL');
    const returned = await detail();
    expect(returned).toMatchObject({ versionId, currentStepKey: 'montaz', status: 'RUNNING' });
    expect(returned.history.map(run => [run.stepKey, run.attempt, run.outcome])).toEqual([
      ['montaz', 1, 'COMPLETED'], ['kontrola', 1, 'RETURNED'], ['montaz', 2, null],
    ]);

    expectStatus(await complete(), 200, 'zakończenie poprawionego montażu');
    await submit('PASS');
    expectStatus(await complete(), 200, 'zakończenie procesu po PASS');
    const finished = await detail();
    expect(finished).toMatchObject({ versionId, status: 'COMPLETED', currentStepKey: null });
    expect(finished.history.map(run => [run.stepKey, run.attempt, run.outcome])).toEqual([
      ['montaz', 1, 'COMPLETED'], ['kontrola', 1, 'RETURNED'],
      ['montaz', 2, 'COMPLETED'], ['kontrola', 2, 'COMPLETED'],
    ]);
    expect(finished.history[1].formInstanceId).not.toBe(finished.history[3].formInstanceId);
    const listed = expectStatus(await admin.get(
      `/api/workflow-instances?definitionId=${definitionId}&subjectType=TASK&subjectId=${taskId}&status=COMPLETED`,
    ), 200, 'filtrowanie realizacji').data;
    expect(listed).toEqual(expect.arrayContaining([expect.objectContaining({ id: instance.id })]));
  });
});

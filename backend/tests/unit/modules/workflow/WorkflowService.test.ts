import { Brigade } from '../../../../src/entities/Brigade';
import { FormFieldDefinition } from '../../../../src/entities/FormFieldDefinition';
import { FormTemplate } from '../../../../src/entities/FormTemplate';
import { FormTemplateVersion } from '../../../../src/entities/FormTemplateVersion';
import { TaskType } from '../../../../src/entities/TaskType';
import { AutomationChain } from '../../../../src/modules/automation/entities/AutomationChain';
import { FunctionGroup } from '../../../../src/modules/function-groups/entities/FunctionGroup';
import { SAFETY_SKIP_WARNING } from '../../../../src/modules/workflow/contracts';
import { WorkflowDefinition } from '../../../../src/modules/workflow/entities/WorkflowDefinition';
import { WorkflowStep } from '../../../../src/modules/workflow/entities/WorkflowStep';
import { WorkflowTransition } from '../../../../src/modules/workflow/entities/WorkflowTransition';
import { WorkflowVersion } from '../../../../src/modules/workflow/entities/WorkflowVersion';
import { WorkflowError } from '../../../../src/modules/workflow/errors';
import { WorkflowService, type WorkflowActor } from '../../../../src/modules/workflow/services/WorkflowService';
import { addWorkflowVersionConstraints, FakeDataSource } from './fakeDataSource';

jest.mock('../../../../src/config/database', () => ({ AppDataSource: { getRepository: jest.fn(), transaction: jest.fn(), query: jest.fn() } }));

const admin: WorkflowActor = { id: 1, permissions: { all: true } };
const builder: WorkflowActor = { id: 2, permissions: { workflow: { read: true, build: true } } };
const JUSTIFICATION = 'Proces testowy na stanowisku szkoleniowym bez wpływu na obiekty.';

let db: FakeDataSource;
let service: WorkflowService;

beforeEach(() => {
  db = new FakeDataSource();
  addWorkflowVersionConstraints(db, WorkflowVersion);
  db.insert(TaskType, [
    { id: 1, code: 'SSP', name: 'System sygnalizacji pożaru', active: true, configuration: { safetyCritical: true } },
    { id: 2, code: 'SMW', name: 'System monitoringu wizyjnego', active: true, configuration: { safetyCritical: false } },
    { id: 3, code: 'SUG', name: 'Stałe urządzenia gaśnicze', active: true, configuration: { safetyCritical: true } },
  ]);
  db.insert(FormTemplate, [{ id: 10, key: 'protokol', name: 'Protokół weryfikacji', active: true }]);
  db.insert(FormTemplateVersion, [{ id: 100, templateId: 10, version: 1, status: 'PUBLISHED' }]);
  db.insert(FormFieldDefinition, [{ id: 1000, templateVersionId: 100, key: 'obraz' }]);
  db.insert(FunctionGroup, [
    { id: 1, key: 'PROCESS_BUILDERS', name: 'Budowniczowie procesów', active: true },
    { id: 2, key: 'PROCESS_AUDITORS', name: 'Audytorzy procesów', active: true },
    { id: 3, key: 'TECHNICAL_REVIEW', name: 'Dział techniczny', active: true },
  ]);
  db.insert(Brigade, [{ id: 5, name: 'Brygada A', active: true }]);
  service = new WorkflowService(db as never);
});

/** Proces 3-etapowy z regułą powrotu: weryfikacja „NIE_OK” wraca do montażu. */
const threeSteps = () => ({
  steps: [
    { key: 'montaz', name: 'Montaż', assigneeType: 'BRIGADE', assigneeRef: 5, dueInHours: 48 },
    { key: 'weryfikacja', name: 'Weryfikacja', assigneeType: 'FUNCTION_GROUP', assigneeRef: 'PROCESS_BUILDERS', formTemplateId: 10 },
    { key: 'odbior', name: 'Odbiór', assigneeType: 'SUBJECT_ASSIGNEE' },
  ],
  transitions: [
    { fromStepKey: 'weryfikacja', toStepKey: 'montaz', condition: { field: 'obraz', operator: 'equals', value: 'NIE_OK' }, priority: 1 },
  ],
});

async function createProcess(taskTypeIds = [2], name = 'Montaż kamer') {
  const definition = await service.createDefinition({ name, subjectType: 'TASK', taskTypeIds }, builder);
  return { definition, draftId: definition.draftVersion!.id };
}

async function publishedProcess(taskTypeIds = [2]) {
  const { definition, draftId } = await createProcess(taskTypeIds);
  await service.saveDraft(draftId, threeSteps(), builder);
  await service.publishVersion(draftId, admin);
  return { definition, versionId: draftId };
}

const errorOf = (promise: Promise<unknown>) => promise.then(() => { throw new Error('Oczekiwano błędu'); }, (error: unknown) => error as WorkflowError);

describe('WorkflowService – definicje', () => {
  it('tworzy definicję z kluczem z nazwy i wersją roboczą 1 (audit: kto i co)', async () => {
    const definition = await service.createDefinition(
      { name: 'Odbiór instalacji – Łódź', description: 'Opis', subjectType: 'TASK', taskTypeIds: [2, 2] },
      builder,
    );
    expect(definition).toMatchObject({
      key: 'odbior_instalacji_lodz',
      name: 'Odbiór instalacji – Łódź',
      subjectType: 'TASK',
      taskTypeIds: [2],
      active: true,
      createdById: 2,
      safetyCritical: false,
      draftVersion: { version: 1, status: 'DRAFT', editable: true, safetyCritical: false, allowSkipPurposeAudit: true },
      publishedVersion: null,
    });
    const version = await service.getVersion(definition.draftVersion!.id);
    expect(version.reviewConfig).toEqual({
      purpose: { functionKey: 'PROCESS_AUDITORS', minApprovals: 1 },
      technical: { functionKey: 'TECHNICAL_REVIEW', minApprovals: 1 },
    });
    expect(db.auditOf('WORKFLOW_DEFINITION_CREATED')).toEqual([
      expect.objectContaining({ userId: 2, details: expect.objectContaining({ definitionId: definition.id, key: 'odbior_instalacji_lodz' }) }),
    ]);
  });

  it('kolejny proces o tej samej nazwie dostaje klucz z sufiksem', async () => {
    await createProcess([2], 'Montaż kamer');
    const { definition } = await createProcess([2], 'Montaż  kamer!');
    expect(definition.key).toBe('montaz_kamer_2');
  });

  it('zwraca wszystkie błędy danych definicji naraz (po polsku)', async () => {
    const error = await errorOf(service.createDefinition({ name: ' ', subjectType: 'ZADANIE', taskTypeIds: 'x' }, builder));
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(error.issues!.map(issue => issue.field)).toEqual(['name', 'subjectType', 'taskTypeIds']);
    expect(error.message).toContain('Podaj nazwę procesu.');
    expect(error.message).toContain('Wybierz, czego dotyczy proces');
  });

  it('typy zadań: tylko dla procesów zadań i tylko istniejące', async () => {
    await expect(service.createDefinition({ name: 'Kontrakt', subjectType: 'CONTRACT', taskTypeIds: [1] }, builder))
      .rejects.toMatchObject({ status: 400, message: 'Typy zadań można wybrać tylko dla procesu, który dotyczy zadań.' });
    await expect(service.createDefinition({ name: 'Zadanie', subjectType: 'TASK', taskTypeIds: [1, 404] }, builder))
      .rejects.toMatchObject({ status: 400, message: 'Nie znaleziono typów zadań o identyfikatorach: 404.' });
    expect(db.rows(WorkflowDefinition)).toHaveLength(0);
  });

  it('zmiana definicji trafia do audit_logs z wartościami przed/po; brak zmian = brak wpisu', async () => {
    const { definition } = await createProcess();
    await service.updateDefinition(definition.id, { name: 'Montaż kamer', active: true }, builder);
    expect(db.auditOf('WORKFLOW_DEFINITION_UPDATED')).toHaveLength(0);

    const updated = await service.updateDefinition(definition.id, { name: 'Montaż kamer IP', active: false }, builder);
    expect(updated).toMatchObject({ name: 'Montaż kamer IP', active: false, key: 'montaz_kamer' });
    expect(db.auditOf('WORKFLOW_DEFINITION_UPDATED')).toEqual([expect.objectContaining({
      userId: 2,
      details: expect.objectContaining({
        before: expect.objectContaining({ name: 'Montaż kamer', active: true }),
        after: expect.objectContaining({ name: 'Montaż kamer IP', active: false }),
      }),
    })]);
  });

  it('po publikacji nie można zmienić typów zadań procesu', async () => {
    const { definition } = await publishedProcess();
    await expect(service.updateDefinition(definition.id, { taskTypeIds: [1] }, builder))
      .rejects.toMatchObject({ status: 409, code: 'CONFLICT' });
  });

  it('usuwa proces bez opublikowanych wersji (z etapami, przejściami i łańcuchami); opublikowanego nie', async () => {
    const { definition, draftId } = await createProcess();
    const saved = await service.saveDraft(draftId, threeSteps(), builder);
    db.insert(AutomationChain, [{ ownerType: 'WORKFLOW_STEP', ownerId: saved.version.steps[0].id, eventType: 'STEP_ENTERED', steps: [], onError: 'STOP' }]);
    await service.deleteDefinition(definition.id, builder);
    expect(db.rows(WorkflowDefinition)).toHaveLength(0);
    expect(db.rows(WorkflowVersion)).toHaveLength(0);
    expect(db.rows(WorkflowStep)).toHaveLength(0);
    expect(db.rows(WorkflowTransition)).toHaveLength(0);
    expect(db.rows(AutomationChain)).toHaveLength(0);
    expect(db.auditOf('WORKFLOW_DEFINITION_DELETED')).toHaveLength(1);

    const published = await publishedProcess();
    await expect(service.deleteDefinition(published.definition.id, builder)).rejects.toMatchObject({ status: 409 });
  });
});

describe('WorkflowService – wersja robocza', () => {
  it('PUT zapisuje całość: etapy, przejścia i ustawienia', async () => {
    const { draftId } = await createProcess();
    const { version, warning } = await service.saveDraft(draftId, {
      ...threeSteps(),
      reviewConfig: { purpose: { functionKey: 'PROCESS_AUDITORS', minApprovals: 2 }, technical: { functionKey: 'TECHNICAL_REVIEW', minApprovals: 1 } },
    }, builder);
    expect(warning).toBeNull();
    expect(version.steps.map(step => [step.key, step.name, step.sortOrder, step.assigneeType, step.assigneeRef, step.formTemplateId, step.dueInHours])).toEqual([
      ['montaz', 'Montaż', 1, 'BRIGADE', '5', null, 48],
      ['weryfikacja', 'Weryfikacja', 2, 'FUNCTION_GROUP', 'PROCESS_BUILDERS', 10, null],
      ['odbior', 'Odbiór', 3, 'SUBJECT_ASSIGNEE', null, null, null],
    ]);
    expect(version.transitions).toEqual([expect.objectContaining({
      fromStepKey: 'weryfikacja', toStepKey: 'montaz', condition: { field: 'obraz', operator: 'equals', value: 'NIE_OK' }, priority: 1,
    })]);
    expect(version.reviewConfig.purpose.minApprovals).toBe(2);
  });

  it('każda zmiana wersji roboczej = wpis w audit_logs (kto, co, przed/po)', async () => {
    const { draftId } = await createProcess();
    await service.saveDraft(draftId, threeSteps(), builder);
    await service.saveDraft(draftId, threeSteps(), builder);
    const entries = db.auditOf('WORKFLOW_DRAFT_UPDATED');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ userId: 2, details: { targetType: 'workflow_version', versionId: draftId, version: 1 } });
    expect(entries[0].details.before.steps).toEqual([]);
    expect(entries[0].details.after.steps.map((step: { key: string }) => step.key)).toEqual(['montaz', 'weryfikacja', 'odbior']);
    expect(entries[0].details.after.transitions).toHaveLength(1);
  });

  it('brakujące klucze etapów są tworzone z nazw; etapy z id zachowują tożsamość, usunięte tracą łańcuchy', async () => {
    const { draftId } = await createProcess();
    const first = await service.saveDraft(draftId, { steps: [{ name: 'Montaż' }, { name: 'Montaż' }, { name: 'Odbiór końcowy' }] }, builder);
    expect(first.version.steps.map(step => step.key)).toEqual(['montaz', 'montaz_2', 'odbior_koncowy']);

    const [montaz, montaz2, odbior] = first.version.steps;
    db.insert(AutomationChain, [{ ownerType: 'WORKFLOW_STEP', ownerId: montaz2.id, eventType: 'STEP_ENTERED', steps: [], onError: 'STOP' }]);
    const second = await service.saveDraft(draftId, {
      steps: [{ id: odbior.id, name: 'Odbiór' }, { id: montaz.id, name: 'Montaż urządzeń' }],
    }, builder);
    expect(second.version.steps.map(step => [step.id, step.key, step.name])).toEqual([
      [odbior.id, 'odbior_koncowy', 'Odbiór'],
      [montaz.id, 'montaz', 'Montaż urządzeń'],
    ]);
    expect(db.rows(AutomationChain)).toHaveLength(0);
  });

  it('etap spoza wersji jest odrzucany', async () => {
    const { draftId } = await createProcess();
    await expect(service.saveDraft(draftId, { steps: [{ id: 999, name: 'Obcy' }] }, builder))
      .rejects.toMatchObject({ status: 400, issues: [expect.objectContaining({ field: 'id' })] });
  });

  it('minApprovals = 0 jest odrzucane (400) i nic nie zapisuje', async () => {
    const { draftId } = await createProcess();
    const error = await errorOf(service.saveDraft(draftId, {
      ...threeSteps(),
      reviewConfig: { purpose: { functionKey: 'PROCESS_AUDITORS', minApprovals: 0 }, technical: { functionKey: 'TECHNICAL_REVIEW', minApprovals: 1 } },
    }, builder));
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(error.message).toBe('Audyt celowości: minimalna liczba akceptacji musi wynosić co najmniej 1.');
    expect(db.rows(WorkflowStep)).toHaveLength(0);
    expect(db.auditOf('WORKFLOW_DRAFT_UPDATED')).toHaveLength(0);
  });

  it('wersja PUBLISHED i SUPERSEDED jest niezmienna (409, komunikat po polsku)', async () => {
    const { definition, versionId } = await publishedProcess();
    const published = await errorOf(service.saveDraft(versionId, { steps: [] }, builder));
    expect(published).toMatchObject({ status: 409, code: 'VERSION_IMMUTABLE', message: 'Wersja 1 jest opublikowana i nie można jej zmieniać. Utwórz nową wersję.' });

    const next = await service.createNextVersion(versionId, builder);
    await service.publishVersion(next.id, admin);
    const superseded = await errorOf(service.saveDraft(versionId, { allowSkipPurposeAudit: false }, builder));
    expect(superseded).toMatchObject({ status: 409, code: 'VERSION_IMMUTABLE', message: 'Wersja 1 została zastąpiona nowszą i nie można jej zmieniać.' });
    await expect(service.publishVersion(versionId, admin)).rejects.toMatchObject({ status: 409 });
    expect((await service.getVersion(versionId)).steps).toHaveLength(3);
    expect((await service.getDefinition(definition.id)).publishedVersion!.id).toBe(next.id);
  });
});

describe('WorkflowService – proces krytyczny dla bezpieczeństwa (SSP/SUG)', () => {
  it('proces dla SSP ma domyślnie safety_critical = true i allow_skip_purpose_audit = false', async () => {
    const { definition } = await createProcess([1, 2]);
    expect(definition.draftVersion).toMatchObject({ safetyCritical: true, allowSkipPurposeAudit: false });
    expect(definition.safetyCritical).toBe(true);
  });

  it('włączenie pomijania audytu bez uzasadnienia (lub z za krótkim) = 400', async () => {
    const { draftId } = await createProcess([1]);
    const missing = await errorOf(service.saveDraft(draftId, { allowSkipPurposeAudit: true }, builder));
    expect(missing).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', issues: [expect.objectContaining({ field: 'skipJustification' })] });
    expect(missing.message).toContain('podaj uzasadnienie (co najmniej 20 znaków)');
    await expect(service.saveDraft(draftId, { allowSkipPurposeAudit: true, skipJustification: '  za krótkie (19 zn) ' }, builder))
      .rejects.toMatchObject({ status: 400 });
    expect((await service.getVersion(draftId)).allowSkipPurposeAudit).toBe(false);
    expect(db.auditOf('SAFETY_SKIP_ENABLED')).toHaveLength(0);
  });

  it('z uzasadnieniem: zapis + warning + wpis SAFETY_SKIP_ENABLED', async () => {
    const { draftId } = await createProcess([3]);
    const result = await service.saveDraft(draftId, { allowSkipPurposeAudit: true, skipJustification: JUSTIFICATION }, builder);
    expect(result.warning).toBe('Proces dotyczy systemu krytycznego dla bezpieczeństwa (SSP/SUG). Pominięcie audytu celowości jest odradzane.');
    expect(result.warning).toBe(SAFETY_SKIP_WARNING);
    expect(result.version).toMatchObject({ safetyCritical: true, allowSkipPurposeAudit: true });
    expect(db.auditOf('SAFETY_SKIP_ENABLED')).toEqual([expect.objectContaining({
      userId: 2,
      details: expect.objectContaining({ versionId: draftId, justification: JUSTIFICATION, taskTypeIds: [3] }),
    })]);
    expect(db.auditOf('WORKFLOW_DRAFT_UPDATED')).toHaveLength(1);
  });

  it('proces niekrytyczny: pomijanie audytu bez uzasadnienia i bez ostrzeżenia', async () => {
    const { draftId } = await createProcess([2]);
    await service.saveDraft(draftId, { allowSkipPurposeAudit: false }, builder);
    const result = await service.saveDraft(draftId, { allowSkipPurposeAudit: true }, builder);
    expect(result).toMatchObject({ warning: null, version: { safetyCritical: false, allowSkipPurposeAudit: true } });
    expect(db.auditOf('SAFETY_SKIP_ENABLED')).toHaveLength(0);
  });

  it('nowa wersja procesu krytycznego wraca do allow_skip = false', async () => {
    const { draftId } = await createProcess([1]);
    await service.saveDraft(draftId, { ...threeSteps(), allowSkipPurposeAudit: true, skipJustification: JUSTIFICATION }, builder);
    await service.publishVersion(draftId, admin);
    const next = await service.createNextVersion(draftId, builder);
    expect(next).toMatchObject({ version: 2, safetyCritical: true, allowSkipPurposeAudit: false });
  });

  it('dodanie typu SSP do procesu przelicza wersję roboczą (safety_critical = true, allow_skip = false)', async () => {
    const { definition, draftId } = await createProcess([2]);
    expect((await service.getVersion(draftId)).allowSkipPurposeAudit).toBe(true);
    await service.updateDefinition(definition.id, { taskTypeIds: [1, 2] }, builder);
    expect(await service.getVersion(draftId)).toMatchObject({ safetyCritical: true, allowSkipPurposeAudit: false });
    expect(db.auditOf('WORKFLOW_SAFETY_RECALCULATED')).toEqual([expect.objectContaining({
      details: expect.objectContaining({ reason: 'DEFINITION_UPDATED', after: { safetyCritical: true, allowSkipPurposeAudit: false } }),
    })]);
  });
});

describe('WorkflowService – walidacja i publikacja', () => {
  it('POST validate zwraca listę problemów bez publikacji', async () => {
    const { draftId } = await createProcess();
    const empty = await service.validateVersion(draftId);
    expect(empty).toEqual({ valid: false, issues: [expect.objectContaining({ code: 'NO_STEPS', message: 'Proces musi mieć co najmniej jeden etap.' })] });

    await service.saveDraft(draftId, threeSteps(), builder);
    expect(await service.validateVersion(draftId)).toEqual({ valid: true, issues: [] });
    expect((await service.getVersion(draftId)).status).toBe('DRAFT');
  });

  it('publikuje tylko administrator', async () => {
    const { draftId } = await createProcess();
    await service.saveDraft(draftId, threeSteps(), builder);
    await expect(service.publishVersion(draftId, builder))
      .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN', message: 'Publikować procesy może tylko administrator.' });
    expect((await service.getVersion(draftId)).status).toBe('DRAFT');
  });

  it('zła definicja nie zostanie opublikowana – wszystkie błędy po polsku', async () => {
    const { draftId } = await createProcess();
    await service.saveDraft(draftId, {
      steps: [
        { key: 'a', name: 'Montaż', assigneeType: 'BRIGADE', assigneeRef: 404, formTemplateId: 77 },
        { key: 'b', name: 'Odbiór' },
      ],
      transitions: [{ fromStepKey: 'b', toStepKey: 'x', condition: null }, { fromStepKey: 'a', toStepKey: 'a', condition: null }],
      reviewConfig: { purpose: { functionKey: 'NIE_MA', minApprovals: 1 }, technical: { functionKey: 'TECHNICAL_REVIEW', minApprovals: 1 } },
    }, builder);
    const error = await errorOf(service.publishVersion(draftId, admin));
    expect(error).toMatchObject({ status: 400, code: 'DEFINITION_INVALID' });
    expect(error.issues!.map(issue => issue.message)).toEqual([
      'Etap „Montaż”: wybrany formularz nie istnieje.',
      'Etap „Montaż”: wybrana brygada nie istnieje.',
      'Etap „Odbiór”: wybierz, kto wykonuje etap.',
      'Reguła przejścia nr 1 prowadzi do etapu „x”, którego nie ma w procesie.',
      'Z etapu „Montaż” nie da się dojść do końca procesu – reguły przejść tworzą pętlę bez wyjścia.',
      'Etap „Odbiór” jest nieosiągalny – nie prowadzi do niego żadna droga od pierwszego etapu „Montaż”.',
      'Audyt celowości: funkcja „NIE_MA” nie istnieje.',
    ]);
    expect(error.message).toBe('Nie można opublikować procesu – popraw błędy (7).');
    expect((await service.getVersion(draftId)).status).toBe('DRAFT');
    expect(db.auditOf('WORKFLOW_VERSION_PUBLISHED')).toHaveLength(0);
  });

  it('publikacja: DRAFT → PUBLISHED, a poprzednia PUBLISHED → SUPERSEDED', async () => {
    const { definition, versionId } = await publishedProcess();
    const v1 = await service.getVersion(versionId);
    expect(v1).toMatchObject({ status: 'PUBLISHED', editable: false, publishedById: 1 });
    expect(v1.publishedAt).toBeInstanceOf(Date);

    const v2 = await service.createNextVersion(versionId, builder);
    const result = await service.publishVersion(v2.id, admin);
    expect(result).toMatchObject({ supersededVersionId: versionId, version: { id: v2.id, version: 2, status: 'PUBLISHED' } });
    expect((await service.getVersion(versionId)).status).toBe('SUPERSEDED');
    const details = await service.getDefinition(definition.id);
    expect(details.versions.map(version => [version.version, version.status])).toEqual([[2, 'PUBLISHED'], [1, 'SUPERSEDED']]);
    expect(db.auditOf('WORKFLOW_VERSION_SUPERSEDED')).toEqual([
      expect.objectContaining({ userId: 1, details: expect.objectContaining({ versionId, supersededByVersionId: v2.id }) }),
    ]);
    expect(db.auditOf('WORKFLOW_VERSION_PUBLISHED')).toHaveLength(2);
  });
});

describe('WorkflowService – nowa wersja', () => {
  it('kopiuje wszystko: etapy, przejścia, ustawienia i łańcuchy automatyzacji', async () => {
    const { draftId } = await createProcess();
    const reviewConfig = { purpose: { functionKey: 'PROCESS_AUDITORS', minApprovals: 2 }, technical: { functionKey: 'TECHNICAL_REVIEW', minApprovals: 3 } };
    const saved = await service.saveDraft(draftId, { ...threeSteps(), allowSkipPurposeAudit: false, reviewConfig }, builder);
    const [montaz, weryfikacja] = saved.version.steps;
    const chainSteps = [{ action: 'send_email', params: { recipientType: 'assignee', subject: 'Etap', body: 'Treść' } }];
    db.insert(AutomationChain, [
      { ownerType: 'WORKFLOW_STEP', ownerId: montaz.id, eventType: 'STEP_ENTERED', steps: chainSteps, onError: 'STOP', createdById: 2 },
      { ownerType: 'WORKFLOW_STEP', ownerId: weryfikacja.id, eventType: 'STEP_COMPLETED', steps: [], onError: 'CONTINUE', createdById: 2 },
    ]);
    await service.publishVersion(draftId, admin);

    const next = await service.createNextVersion(draftId, builder);
    expect(next).toMatchObject({ version: 2, status: 'DRAFT', editable: true, authorId: 2, allowSkipPurposeAudit: false, reviewConfig, publishedAt: null });
    const strip = ({ id: _id, chains: _chains, ...rest }: { id: number; chains: unknown }) => rest;
    const source = await service.getVersion(draftId);
    expect(next.steps.map(strip)).toEqual(source.steps.map(strip));
    expect(next.steps.map(step => step.id)).not.toEqual(source.steps.map(step => step.id));
    expect(next.transitions.map(({ id: _id, ...rest }) => rest)).toEqual(source.transitions.map(({ id: _id, ...rest }) => rest));
    expect(next.steps[0].chains).toEqual([expect.objectContaining({ eventType: 'STEP_ENTERED', steps: chainSteps, onError: 'STOP' })]);
    expect(next.steps[1].chains).toEqual([expect.objectContaining({ eventType: 'STEP_COMPLETED', onError: 'CONTINUE' })]);
    expect(next.steps[2].chains).toEqual([]);
    expect(db.rows(AutomationChain)).toHaveLength(4);
    expect(db.auditOf('WORKFLOW_VERSION_CREATED')).toEqual([expect.objectContaining({
      details: expect.objectContaining({ versionId: next.id, sourceVersionId: draftId, copied: { steps: 3, transitions: 1, chains: 2 } }),
    })]);

    // Kopia jest niezależna: zmiana wersji roboczej nie rusza opublikowanej.
    await service.saveDraft(next.id, { steps: [{ id: next.steps[0].id, name: 'Montaż' }] }, builder);
    expect((await service.getVersion(draftId)).steps).toHaveLength(3);
  });

  it('tylko z wersji opublikowanej i tylko gdy nie ma już wersji roboczej', async () => {
    const { draftId } = await createProcess();
    await expect(service.createNextVersion(draftId, builder))
      .rejects.toMatchObject({ status: 409, message: 'Nową wersję tworzy się z wersji opublikowanej.' });
    await service.saveDraft(draftId, threeSteps(), builder);
    await service.publishVersion(draftId, admin);
    await service.createNextVersion(draftId, builder);
    await expect(service.createNextVersion(draftId, builder))
      .rejects.toMatchObject({ status: 409, message: 'Proces ma już wersję roboczą (wersja 2) – wprowadź zmiany w niej zamiast tworzyć kolejną.' });
    await expect(service.createNextVersion(404, builder)).rejects.toMatchObject({ status: 404 });
  });
});

describe('WorkflowService – lista', () => {
  it('lista procesów zawiera wersję opublikowaną i roboczą', async () => {
    const { versionId } = await publishedProcess();
    await service.createNextVersion(versionId, builder);
    const [summary] = await service.listDefinitions();
    expect(summary).toMatchObject({
      name: 'Montaż kamer',
      latestVersion: { version: 2, status: 'DRAFT' },
      publishedVersion: { version: 1, status: 'PUBLISHED' },
      draftVersion: { version: 2 },
    });
    expect(await service.listVersions(summary.id)).toHaveLength(2);
    await expect(service.getDefinition(404)).rejects.toMatchObject({ status: 404, message: 'Nie znaleziono procesu.' });
  });
});

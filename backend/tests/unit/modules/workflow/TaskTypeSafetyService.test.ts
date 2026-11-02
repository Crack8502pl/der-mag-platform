import { TaskType } from '../../../../src/entities/TaskType';
import { FunctionGroup } from '../../../../src/modules/function-groups/entities/FunctionGroup';
import { WorkflowVersion } from '../../../../src/modules/workflow/entities/WorkflowVersion';
import { TaskTypeSafetyService } from '../../../../src/modules/workflow/services/TaskTypeSafetyService';
import { WorkflowService } from '../../../../src/modules/workflow/services/WorkflowService';
import { addWorkflowVersionConstraints, FakeDataSource } from './fakeDataSource';

jest.mock('../../../../src/config/database', () => ({ AppDataSource: { getRepository: jest.fn(), transaction: jest.fn(), query: jest.fn() } }));

const admin = { id: 1, permissions: { all: true } };

let db: FakeDataSource;
let workflows: WorkflowService;
let service: TaskTypeSafetyService;

beforeEach(() => {
  db = new FakeDataSource();
  addWorkflowVersionConstraints(db, WorkflowVersion);
  db.insert(TaskType, [
    { id: 1, code: 'SSP', name: 'System sygnalizacji pożaru', description: null, active: true, configuration: { safetyCritical: true } },
    { id: 2, code: 'SMW', name: 'System monitoringu wizyjnego', description: 'Kamery', active: true, configuration: { safetyCritical: false, bomTemplate: 'X' } },
    { id: 3, code: 'OLD', name: 'Archiwalny typ', description: null, active: false, configuration: {} },
  ]);
  db.insert(FunctionGroup, [
    { id: 2, key: 'PROCESS_AUDITORS', name: 'Audytorzy procesów', active: true },
    { id: 3, key: 'TECHNICAL_REVIEW', name: 'Dział techniczny', active: true },
  ]);
  workflows = new WorkflowService(db as never);
  service = new TaskTypeSafetyService(db as never, workflows);
});

describe('TaskTypeSafetyService – przełącznik „Krytyczny dla bezpieczeństwa”', () => {
  it('lista zawiera wszystkie typy zadań (także nieaktywne) z ustawieniem', async () => {
    expect(await service.list()).toEqual([
      { id: 3, name: 'Archiwalny typ', code: 'OLD', description: null, active: false, safetyCritical: false },
      { id: 2, name: 'System monitoringu wizyjnego', code: 'SMW', description: 'Kamery', active: true, safetyCritical: false },
      { id: 1, name: 'System sygnalizacji pożaru', code: 'SSP', description: null, active: true, safetyCritical: true },
    ]);
  });

  it('włączenie zapisuje configuration.safetyCritical, audit i przelicza wersje robocze procesów tego typu', async () => {
    const process = await workflows.createDefinition({ name: 'Montaż kamer', subjectType: 'TASK', taskTypeIds: [2] }, admin);
    const other = await workflows.createDefinition({ name: 'Kontrakt', subjectType: 'CONTRACT' }, admin);
    expect(process.draftVersion).toMatchObject({ safetyCritical: false, allowSkipPurposeAudit: true });

    const result = await service.setSafetyCritical(2, { safetyCritical: true }, admin.id);
    expect(result).toEqual({
      taskType: { id: 2, name: 'System monitoringu wizyjnego', code: 'SMW', description: 'Kamery', active: true, safetyCritical: true },
      refreshedDrafts: 1,
    });
    expect(db.rows(TaskType).find(row => row.id === 2).configuration).toEqual({ safetyCritical: true, bomTemplate: 'X' });
    expect(db.auditOf('TASK_TYPE_SAFETY_CRITICAL_CHANGED')).toEqual([expect.objectContaining({
      userId: 1,
      details: expect.objectContaining({ targetType: 'task_type', taskTypeId: 2, code: 'SMW', before: { safetyCritical: false }, after: { safetyCritical: true } }),
    })]);
    expect(await workflows.getVersion(process.draftVersion!.id)).toMatchObject({ safetyCritical: true, allowSkipPurposeAudit: false });
    expect(await workflows.getVersion(other.draftVersion!.id)).toMatchObject({ safetyCritical: false });
    expect(db.auditOf('WORKFLOW_SAFETY_RECALCULATED')).toEqual([
      expect.objectContaining({ details: expect.objectContaining({ reason: 'TASK_TYPE_CHANGED', versionId: process.draftVersion!.id }) }),
    ]);
  });

  it('wyłączenie nie włącza samo pomijania audytu celowości', async () => {
    const process = await workflows.createDefinition({ name: 'Odbiór SSP', subjectType: 'TASK', taskTypeIds: [1] }, admin);
    const result = await service.setSafetyCritical(1, { safetyCritical: false }, admin.id);
    expect(result.refreshedDrafts).toBe(1);
    expect(await workflows.getVersion(process.draftVersion!.id)).toMatchObject({ safetyCritical: false, allowSkipPurposeAudit: false });
  });

  it('brak zmiany = brak wpisu; zła wartość = 400; nieznany typ = 404', async () => {
    await expect(service.setSafetyCritical(1, { safetyCritical: true }, admin.id)).resolves.toMatchObject({ refreshedDrafts: 0 });
    // Brak klucza = „nie”: zapis jawnej wartości bez zmiany znaczenia nie jest zmianą do audytu.
    await expect(service.setSafetyCritical(3, { safetyCritical: false }, admin.id)).resolves.toMatchObject({ refreshedDrafts: 0 });
    expect(db.rows(TaskType).find(row => row.id === 3).configuration).toEqual({ safetyCritical: false });
    expect(db.audit).toHaveLength(0);
    await expect(service.setSafetyCritical(1, { safetyCritical: 'tak' }, admin.id))
      .rejects.toMatchObject({ status: 400, message: 'Ustawienie „Krytyczny dla bezpieczeństwa” musi mieć wartość tak albo nie.' });
    await expect(service.setSafetyCritical(404, { safetyCritical: true }, admin.id))
      .rejects.toMatchObject({ status: 404, message: 'Nie znaleziono typu zadania.' });
  });
});

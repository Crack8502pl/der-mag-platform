import { DomainEventBus, type DomainEvent } from '../../../../src/modules/events/DomainEventBus';
import { WorkflowInstanceService } from '../../../../src/modules/workflow/services/WorkflowInstanceService';
import { WorkflowDefinition } from '../../../../src/modules/workflow/entities/WorkflowDefinition';
import { WorkflowVersion } from '../../../../src/modules/workflow/entities/WorkflowVersion';
import { WorkflowStep } from '../../../../src/modules/workflow/entities/WorkflowStep';
import { WorkflowTransition } from '../../../../src/modules/workflow/entities/WorkflowTransition';
import { WorkflowInstance } from '../../../../src/modules/workflow/entities/WorkflowInstance';
import { WorkflowStepRun } from '../../../../src/modules/workflow/entities/WorkflowStepRun';
import { User } from '../../../../src/entities/User';
import { Role } from '../../../../src/entities/Role';
import { Task } from '../../../../src/entities/Task';
import { TaskAssignment } from '../../../../src/entities/TaskAssignment';
import { Contract } from '../../../../src/entities/Contract';
import { Device } from '../../../../src/entities/Device';
import { Brigade } from '../../../../src/entities/Brigade';
import { BrigadeMember } from '../../../../src/entities/BrigadeMember';
import { FormTemplateVersion } from '../../../../src/entities/FormTemplateVersion';
import { FormInstance } from '../../../../src/entities/FormInstance';
import { FormFieldDefinition } from '../../../../src/entities/FormFieldDefinition';
import { FormFieldValue } from '../../../../src/entities/FormFieldValue';
import { FormSection } from '../../../../src/entities/FormSection';
import { FunctionGroup } from '../../../../src/modules/function-groups/entities/FunctionGroup';
import { FakeDataSource } from './fakeDataSource';

jest.mock('../../../../src/config/database', () => ({ AppDataSource: {} }));

const executor = { id: 1, permissions: { workflow: { start: true, execute: true, read: true } } };
const override = { id: 2, permissions: { workflow: { execute: true, read: true, override: true } } };
let db: FakeDataSource;
let service: WorkflowInstanceService;
let events: DomainEvent[];
let effective: jest.Mock;

function step(id: number, extra: Record<string, unknown> = {}) {
  return { id, versionId: 1, key: `s${id}`, name: `Etap ${id}`, sortOrder: id, assigneeType: 'USER', assigneeRef: '1', formTemplateId: null, dueInHours: null, ...extra };
}

beforeEach(() => {
  db = new FakeDataSource();
  Object.assign(db, { manager: db });
  db.insert(User, [{ id: 1, active: true, roleId: 5 }, { id: 2, active: true, roleId: 6 }]);
  db.insert(Task, [{ id: 10, taskTypeId: 3 }]);
  db.insert(WorkflowDefinition, [{ id: 1, subjectType: 'TASK', active: true, taskTypeIds: [3] }]);
  db.insert(WorkflowVersion, [{ id: 1, definitionId: 1, version: 1, status: 'PUBLISHED' }]);
  db.insert(WorkflowStep, [step(1), step(2), step(3)]);
  events = [];
  const bus = new DomainEventBus();
  for (const type of ['WORKFLOW_STARTED', 'STEP_ENTERED', 'STEP_COMPLETED', 'WORKFLOW_COMPLETED', 'WORKFLOW_FORCED', 'WORKFLOW_CANCELLED']) {
    bus.subscribe(type, event => { events.push(event); });
  }
  effective = jest.fn(async () => ({ functionGroups: [{ key: 'INSTALLERS' }] }));
  service = new WorkflowInstanceService(db as never, bus, effective);
});

const start = () => service.start({ definitionId: 1, subjectId: 10 }, executor);

describe('Realizacje procesów W3b', () => {
  it('wykonuje trzy etapy liniowo, zapisuje historię i zdarzenia po zatwierdzeniu', async () => {
    let instance = await start();
    expect(instance.currentStepKey).toBe('s1');
    expect(events.map(event => event.type)).toEqual(['WORKFLOW_STARTED', 'STEP_ENTERED']);
    for (let index = 0; index < 3; index++) instance = await service.complete(instance.id, executor);
    expect(instance).toMatchObject({ status: 'COMPLETED', currentStepRunId: null, currentStepKey: null });
    expect(instance.history.map(run => [run.stepKey, run.attempt, run.outcome])).toEqual([
      ['s1', 1, 'COMPLETED'], ['s2', 1, 'COMPLETED'], ['s3', 1, 'COMPLETED'],
    ]);
    expect(events.filter(event => event.type === 'STEP_COMPLETED')).toHaveLength(3);
    expect(db.auditOf('WORKFLOW_INSTANCE_COMPLETED')).toHaveLength(1);
    await expect(service.complete(instance.id, executor)).rejects.toMatchObject({ status: 409 });
  });

  it('wiąże wersję v1 pomimo publikacji v2 i wybiera najnowszą przy nowym uruchomieniu', async () => {
    const first = await start();
    await db.getRepository(WorkflowVersion).save({ id: 1, status: 'SUPERSEDED' });
    db.insert(WorkflowVersion, [{ id: 2, definitionId: 1, version: 2, status: 'PUBLISHED' }]);
    db.insert(WorkflowStep, [step(11, { versionId: 2, key: 'nowy' })]);
    await expect(start()).rejects.toMatchObject({ status: 409 });
    expect((await service.complete(first.id, executor))).toMatchObject({ versionId: 1, currentStepKey: 's2' });
    await service.cancel(first.id, { reason: 'Powtórne uruchomienie' }, override);
    expect(await start()).toMatchObject({ versionId: 2, currentStepKey: 'nowy' });
  });

  it('blokuje duplikat RUNNING i błędny przedmiot lub typ zadania', async () => {
    await start();
    await expect(start()).rejects.toMatchObject({ status: 409 });
    await expect(service.start({ definitionId: 1, subjectId: 999 }, executor)).rejects.toMatchObject({ status: 404 });
    db.insert(Task, [{ id: 11, taskTypeId: 4 }]);
    await expect(service.start({ definitionId: 1, subjectId: 11 }, executor)).rejects.toMatchObject({ status: 400 });
    await expect(service.start({ definitionId: 1, subjectId: 10, subjectType: 'DEVICE' }, executor)).rejects.toMatchObject({ status: 400 });
  });

  it('nie uruchamia wersji roboczej ani nieaktywnej definicji', async () => {
    await db.getRepository(WorkflowVersion).save({ id: 1, status: 'DRAFT' });
    await expect(start()).rejects.toMatchObject({ status: 409 });
    await db.getRepository(WorkflowDefinition).save({ id: 1, active: false });
    await expect(start()).rejects.toMatchObject({ status: 404 });
    expect(events).toHaveLength(0);
    expect(db.rows(WorkflowInstance)).toHaveLength(0);
  });

  it('odrzuca niewłaściwego wykonawcę (403), nawet posiadającego execute', async () => {
    await expect(service.start({ definitionId: 1, subjectId: 10 }, { id: 1, permissions: { workflow: { execute: true } } })).rejects.toMatchObject({ status: 403 });
    const instance = await start();
    await expect(service.complete(instance.id, { ...executor, id: 2 })).rejects.toMatchObject({ status: 403 });
    expect((await service.getById(instance.id, executor)).currentStepKey).toBe('s1');
    await expect(service.complete(instance.id, { id: 1, permissions: {} })).rejects.toMatchObject({ status: 403 });
    await expect(service.complete(instance.id, { id: 2, permissions: { workflow: { override: true } } })).rejects.toMatchObject({ status: 403 });
  });

  it('pozwala uruchomić proces z samym start i odczytać moje etapy z samym read, bez prawa wykonania', async () => {
    const starter = { id: 1, permissions: { workflow: { start: true } } };
    const reader = { id: 1, permissions: { workflow: { read: true } } };
    const instance = await service.start({ definitionId: 1, subjectId: 10 }, starter);
    expect(instance.currentStepKey).toBe('s1');
    expect(await service.mySteps(reader)).toHaveLength(1);
    await expect(service.mySteps(starter)).rejects.toMatchObject({ status: 403 });
    await expect(service.complete(instance.id, starter)).rejects.toMatchObject({ status: 403 });
    await expect(service.complete(instance.id, reader)).rejects.toMatchObject({ status: 403 });
  });

  it('wymaga uzasadnienia i celu wymuszenia, zapisuje FORCED, aktora i zdarzenie', async () => {
    const instance = await start();
    await expect(service.force(instance.id, { targetStepKey: 's3' }, override)).rejects.toMatchObject({ status: 400 });
    await expect(service.force(instance.id, { reason: 'Awaria' }, override)).rejects.toMatchObject({ status: 400 });
    await expect(service.force(instance.id, { reason: 'Awaria', targetStepKey: 'obcy' }, override)).rejects.toMatchObject({ status: 400 });
    await expect(service.force(instance.id, { reason: 'Awaria', targetStepKey: 's3' }, executor)).rejects.toMatchObject({ status: 403 });
    const forced = await service.force(instance.id, { reason: '  Awaria  ', targetStepKey: 's3' }, override);
    expect(forced.history[0]).toMatchObject({ outcome: 'FORCED', completedById: 2, reason: 'Awaria' });
    expect(forced.currentStepKey).toBe('s3');
    expect(events.find(event => event.type === 'WORKFLOW_FORCED')?.payload).toMatchObject({ outcome: 'FORCED', reason: 'Awaria', workflowStepId: 1 });
    expect(db.auditOf('WORKFLOW_STEP_FORCED')).toHaveLength(1);
    const backward = await service.force(instance.id, { reason: 'Powrót awaryjny', toStepKey: 's1' }, override);
    expect(backward.currentStepRun).toMatchObject({ stepKey: 's1', attempt: 2 });
    expect(backward.history[1]).toMatchObject({ stepKey: 's3', outcome: 'FORCED', note: 'Powrót awaryjny' });
    expect(events.filter(event => event.type === 'WORKFLOW_FORCED')).toHaveLength(2);
  });

  it('anuluje wyłącznie z override i uzasadnieniem, zamyka aktywny etap', async () => {
    const instance = await start();
    await expect(service.cancel(instance.id, {}, override)).rejects.toMatchObject({ status: 400 });
    await expect(service.cancel(instance.id, { reason: 'Rezygnacja' }, executor)).rejects.toMatchObject({ status: 403 });
    expect(await service.cancel(instance.id, { reason: 'Rezygnacja' }, override)).toMatchObject({
      status: 'CANCELLED', cancellationReason: 'Rezygnacja', currentStepRunId: null,
      history: [expect.objectContaining({ outcome: 'CANCELLED' })],
    });
    expect(events.filter(event => event.type === 'STEP_COMPLETED')).toHaveLength(0);
    expect(db.auditOf('WORKFLOW_INSTANCE_CANCELLED')).toHaveLength(1);
  });

  it('wylicza termin, udostępnia filtry i odrzuca błędne filtry', async () => {
    await db.getRepository(WorkflowStep).save({ id: 1, dueInHours: 4 });
    const instance = await start();
    const run = instance.currentStepRun!;
    expect(run.dueAt!.getTime() - run.enteredAt.getTime()).toBe(4 * 3600000);
    expect(await service.list({ definitionId: 1, status: 'RUNNING', stepKey: 's1', subjectId: 10, subjectType: 'TASK' }, executor)).toHaveLength(1);
    expect(await service.list({ overdue: true }, executor)).toHaveLength(0);
    await db.getRepository(WorkflowStepRun).save({ id: run.id, dueAt: new Date(Date.now() - 1000) });
    expect(await service.list({ overdue: true }, executor)).toHaveLength(1);
    await expect(service.list({ status: 'INVALID' as never }, executor)).rejects.toMatchObject({ status: 400 });
    await expect(service.list({ subjectType: 'INVALID' as never }, executor)).rejects.toMatchObject({ status: 400 });
  });

  it.each(['ROLE', 'FUNCTION_GROUP', 'BRIGADE'] as const)('przypisuje grupę %s i uwzględnia członkostwo w moich etapach', async type => {
    db.insert(Role, [{ id: 5, name: 'Monter' }]);
    db.insert(FunctionGroup, [{ id: 7, key: 'INSTALLERS', active: true }]);
    db.insert(Brigade, [{ id: 8, active: true }]);
    db.insert(BrigadeMember, [{ brigadeId: 8, userId: 1, active: true, validFrom: '2020-01-01', validTo: null }]);
    await db.getRepository(WorkflowStep).save({ id: 1, assigneeType: type, assigneeRef: type === 'ROLE' ? '5' : type === 'BRIGADE' ? '8' : 'INSTALLERS' });
    const instance = await start();
    expect(instance.currentStepRun).toMatchObject({ assignedUserId: null, assignedGroupType: type });
    expect(await service.mySteps(executor)).toHaveLength(1);
    if (type === 'BRIGADE') {
      await db.getRepository(Brigade).save({ id: 8, active: false });
      expect(await service.mySteps(executor)).toHaveLength(0);
      await expect(service.complete(instance.id, executor)).rejects.toMatchObject({ status: 403 });
      await db.getRepository(Brigade).save({ id: 8, active: true });
    }
    expect(await service.complete(instance.id, executor)).toMatchObject({ currentStepKey: 's2' });
  });

  it('nie pokazuje etapów dla wygasłych członkostw i obcych ról', async () => {
    db.insert(Brigade, [{ id: 8, active: true }]);
    db.insert(BrigadeMember, [{ brigadeId: 8, userId: 1, active: true, validFrom: '2020-01-01', validTo: '2020-01-02' }]);
    await db.getRepository(WorkflowStep).save({ id: 1, assigneeType: 'BRIGADE', assigneeRef: '8' });
    const instance = await start();
    expect(await service.mySteps(executor)).toHaveLength(0);
    await expect(service.complete(instance.id, executor)).rejects.toMatchObject({ status: 403 });
    await db.getRepository(WorkflowStepRun).save({ id: instance.currentStepRunId, assignedGroupType: 'FUNCTION_GROUP', assignedGroupRef: 'INSTALLERS' });
    effective.mockResolvedValue({ functionGroups: [] });
    expect(await service.mySteps(executor)).toHaveLength(0);
    await db.getRepository(WorkflowStepRun).save({ id: instance.currentStepRunId, assignedGroupType: 'ROLE', assignedGroupRef: '6' });
    expect(await service.mySteps(executor)).toHaveLength(0);
  });

  it.each(['TASK', 'CONTRACT', 'DEVICE'] as const)('rozwiązuje osobę przypisaną do przedmiotu %s', async subjectType => {
    db.insert(Contract, [{ id: 10, projectManagerId: 1 }]);
    db.insert(Device, [{ id: 10, taskId: 10 }]);
    db.insert(TaskAssignment, [{ id: 1, taskId: 10, userId: 1, assignedAt: new Date() }]);
    await db.getRepository(WorkflowDefinition).save({ id: 1, subjectType });
    await db.getRepository(WorkflowStep).save({ id: 1, assigneeType: 'SUBJECT_ASSIGNEE', assigneeRef: null });
    expect((await start()).currentStepRun).toMatchObject({ assignedUserId: 1, assigneeType: 'SUBJECT_ASSIGNEE' });
  });

  it('wycofuje całą transakcję i zdarzenia, gdy brak wykonawcy etapu', async () => {
    await db.getRepository(WorkflowStep).save({ id: 1, assigneeType: 'SUBJECT_ASSIGNEE' });
    await expect(start()).rejects.toMatchObject({ status: 409 });
    expect(events).toHaveLength(0);
    expect(db.rows(WorkflowInstance)).toHaveLength(0);
    expect(db.audit).toHaveLength(0);
  });

  async function formSetup(settings = {}, fieldType = 'PASS_FAIL') {
    db.insert(FormTemplateVersion, [{ id: 20, templateId: 2, version: 1, status: 'PUBLISHED', settings }]);
    db.insert(FormSection, [{ id: 25, templateVersionId: 20, key: 'main', conditions: {} }]);
    db.insert(FormFieldDefinition, [{ id: 30, templateVersionId: 20, sectionId: 25, key: 'result', fieldType, conditions: {}, options: fieldType === 'RADIO' ? { values: ['PASS', 'FAIL'] } : {}, validation: {} }]);
    await db.getRepository(WorkflowStep).save({ id: 1, formTemplateId: 2 });
  }

  it('przechodzi FAIL → powrót (próba 2) → PASS zgodnie z priorytetami warunków', async () => {
    await formSetup({}, 'RADIO');
    db.insert(WorkflowTransition, [
      { id: 1, versionId: 1, fromStepKey: 's1', toStepKey: 's1', condition: { field: 'result', operator: 'equals', value: 'FAIL' }, priority: 1 },
      { id: 2, versionId: 1, fromStepKey: 's1', toStepKey: 's3', condition: { field: 'result', operator: 'equals', value: 'PASS' }, priority: 2 },
      { id: 3, versionId: 1, fromStepKey: 's1', toStepKey: 's2', condition: null, priority: 10 },
    ]);
    const instance = await start();
    const firstForm = instance.currentStepRun!.formInstanceId!;
    await db.getRepository(FormInstance).save({ id: firstForm, status: 'SUBMITTED' });
    db.insert(FormFieldValue, [{ instanceId: firstForm, fieldDefinitionId: 30, value: 'FAIL' }]);
    const returned = await service.complete(instance.id, executor);
    expect(returned.currentStepRun).toMatchObject({ stepKey: 's1', attempt: 2 });
    expect(returned.history[0]).toMatchObject({ outcome: 'RETURNED', formTemplateVersionId: 20 });
    expect(returned.currentStepRun!.formInstanceId).not.toBe(firstForm);
    const secondForm = returned.currentStepRun!.formInstanceId!;
    await db.getRepository(FormInstance).save({ id: secondForm, status: 'SUBMITTED' });
    db.insert(FormFieldValue, [{ instanceId: secondForm, fieldDefinitionId: 30, value: 'PASS' }]);
    expect(await service.complete(instance.id, executor)).toMatchObject({ currentStepKey: 's3', history: expect.arrayContaining([expect.objectContaining({ stepKey: 's1', attempt: 2, outcome: 'COMPLETED' })]) });
  });

  it.each(['TASK', 'CONTRACT', 'DEVICE'] as const)('tworzy formularz przypięty do najnowszej opublikowanej wersji dla %s', async subjectType => {
    await formSetup();
    db.insert(Contract, [{ id: 10 }]);
    db.insert(Device, [{ id: 10 }]);
    await db.getRepository(WorkflowDefinition).save({ id: 1, subjectType });
    db.insert(FormTemplateVersion, [
      { id: 21, templateId: 2, version: 2, status: 'PUBLISHED', settings: {} },
      { id: 22, templateId: 2, version: 3, status: 'DRAFT', settings: {} },
    ]);
    const instance = await start();
    expect(db.rows(FormInstance)[0]).toMatchObject({ templateVersionId: 21, [`${subjectType.toLowerCase()}Id`]: 10 });
    db.insert(FormTemplateVersion, [{ id: 23, templateId: 2, version: 4, status: 'PUBLISHED', settings: {} }]);
    await expect(service.complete(instance.id, override)).rejects.toMatchObject({ status: 409 });
    expect(db.rows(FormInstance)[0].templateVersionId).toBe(21);
  });

  it.each([{ approvalRequired: true }, { requiresApproval: true }, { approval: { required: true } }])('wymaga zatwierdzenia formularza (%j), także dla override/admin', async settings => {
    await formSetup(settings);
    const instance = await start();
    const formId = instance.currentStepRun!.formInstanceId!;
    await db.getRepository(FormInstance).save({ id: formId, status: 'SUBMITTED' });
    await expect(service.complete(instance.id, { id: 2, permissions: { all: true } })).rejects.toMatchObject({ status: 409 });
    await db.getRepository(FormInstance).save({ id: formId, status: 'REJECTED' });
    await expect(service.complete(instance.id, executor)).rejects.toMatchObject({ status: 409 });
    await db.getRepository(FormInstance).save({ id: formId, status: 'APPROVED' });
    expect(await service.complete(instance.id, executor)).toMatchObject({ currentStepKey: 's2' });
  });
});

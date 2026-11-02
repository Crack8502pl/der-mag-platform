import express from 'express';
import request from 'supertest';
import { DataSource, Table } from 'typeorm';
import { AppDataSource } from '../../src/config/database';
import { generateAccessToken } from '../../src/config/jwt';
import { User } from '../../src/entities/User';
import { Role } from '../../src/entities/Role';
import { Task } from '../../src/entities/Task';
import { TaskType } from '../../src/entities/TaskType';
import { TaskMetric } from '../../src/entities/TaskMetric';
import { Subsystem } from '../../src/entities/Subsystem';
import { Contract } from '../../src/entities/Contract';
import { Device } from '../../src/entities/Device';
import { TaskAssignment } from '../../src/entities/TaskAssignment';
import { Brigade } from '../../src/entities/Brigade';
import { BrigadeMember } from '../../src/entities/BrigadeMember';
import { FormTemplateVersion } from '../../src/entities/FormTemplateVersion';
import { FormInstance } from '../../src/entities/FormInstance';
import { FormFieldValue } from '../../src/entities/FormFieldValue';
import { WorkflowInstance } from '../../src/modules/workflow/entities/WorkflowInstance';
import { WorkflowStepRun } from '../../src/modules/workflow/entities/WorkflowStepRun';
import { WorkflowStep } from '../../src/modules/workflow/entities/WorkflowStep';
import { WorkflowVersion } from '../../src/modules/workflow/entities/WorkflowVersion';
import { WorkflowInstanceService } from '../../src/modules/workflow/services/WorkflowInstanceService';
import { DomainEventBus, domainEventBus, type DomainEvent } from '../../src/modules/events/DomainEventBus';
import { EffectivePermissionsService } from '../../src/modules/function-groups/services/EffectivePermissionsService';
import { AutomationExecutionService, ownerFromEvent } from '../../src/modules/automation/services/AutomationExecutionService';
import { TypeOrmAutomationStore } from '../../src/modules/automation/services/AutomationStore';
import { AutomationRegistry } from '../../src/modules/automation/registry/AutomationRegistry';
import { AutomationRun } from '../../src/modules/automation/entities/AutomationRun';
import { CreateFormChecklistEngine1790971200000 } from '../../src/migrations/20261002_create_form_checklist_engine';
import { CreateFormHeaderFooters1793454000000 } from '../../src/migrations/20261031_create_form_header_footers';
import { CreateFormAuditLogs1793454000001 } from '../../src/migrations/20261031_create_form_audit_logs';
import { CreateFunctionGroups1793553600000 } from '../../src/migrations/20261101_create_function_groups';
import { CreateAutomation1793640000000 } from '../../src/migrations/20261102_create_automation';
import { CreateWorkflowDefinitions1793643600000 } from '../../src/migrations/20261102_create_workflow_definitions';
import { CreateWorkflowInstances1793647200000 } from '../../src/migrations/20261102_create_workflow_instances';
import workflowRoutes from '../../src/modules/workflow/routes/workflowInstance.routes';
import formsRoutes from '../../src/routes/forms.routes';
import { FormInstanceService } from '../../src/services/FormInstanceService';
import { FormApprovalService } from '../../src/services/FormApprovalService';

const databaseUrl = process.env.FORM_ENGINE_TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Realizacje procesów W3b – PostgreSQL i HTTP', () => {
  let source: DataSource;
  let service: WorkflowInstanceService;
  let bus: DomainEventBus;
  let events: DomainEvent[];
  const schema = `workflow_runtime_test_${process.pid}`;
  const executor = { id: 1, permissions: { workflow: { read: true, start: true, execute: true } } };
  const administrator = { id: 2, permissions: { all: true } };
  const app = express();
  app.use(express.json());
  app.use('/api/workflow-instances', workflowRoutes);
  app.use('/api/forms', formsRoutes);

  beforeAll(async () => {
    expect(AppDataSource.options.migrations).toContain(CreateWorkflowInstances1793647200000);
    source = new DataSource({
      type: 'postgres', url: databaseUrl, schema, entities: AppDataSource.options.entities,
      synchronize: false, extra: { options: `-c search_path=${schema}`, max: 10 },
    });
    await source.initialize();
    jest.spyOn(AppDataSource, 'getRepository').mockImplementation(source.getRepository.bind(source));
    jest.spyOn(AppDataSource, 'transaction').mockImplementation(source.transaction.bind(source));
    jest.spyOn(AppDataSource, 'query').mockImplementation(source.query.bind(source));
    Object.assign(AppDataSource, { manager: source.manager });
  }, 30000);

  async function createSchema() {
    const runner = source.createQueryRunner();
    await runner.connect();
    await runner.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await runner.query(`CREATE SCHEMA "${schema}"`);
    // Tylko zastane tabele domenowe; nowe moduły powstają wyłącznie przez ich migracje.
    for (const entity of [User, Role, Task, TaskType, TaskMetric, TaskAssignment, Subsystem, Contract, Device, Brigade, BrigadeMember]) {
      const metadata = source.getMetadata(entity);
      await runner.createTable(new Table({
        name: metadata.tableName,
        columns: metadata.columns.map(column => ({
          name: column.databaseName, type: source.driver.normalizeType(column),
          length: column.length || undefined, precision: column.precision, scale: column.scale,
          isPrimary: column.isPrimary, isGenerated: column.isGenerated,
          generationStrategy: column.isGenerated ? 'increment' : undefined,
          isNullable: !column.isPrimary, isArray: column.isArray,
        })),
      }));
    }
    for (const table of ['subsystem_tasks', 'assets', 'task_generated_bom_items', 'workflow_generated_bom_items', 'documents', 'photos']) {
      await runner.query(`CREATE TABLE ${table} (id INTEGER PRIMARY KEY)`);
    }
    for (const migration of [
      new CreateFormChecklistEngine1790971200000(), new CreateFormHeaderFooters1793454000000(),
      new CreateFormAuditLogs1793454000001(), new CreateFunctionGroups1793553600000(),
      new CreateAutomation1793640000000(), new CreateWorkflowDefinitions1793643600000(),
      new CreateWorkflowInstances1793647200000(),
    ]) await migration.up(runner);
    await runner.release();
  }

  afterAll(async () => {
    jest.restoreAllMocks();
    domainEventBus.clear();
    if (source?.isInitialized) {
      await source.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await source.destroy();
    }
  });

  beforeEach(async () => {
    await createSchema();
    await source.query(`INSERT INTO roles (id, name, permissions) VALUES
      (5, 'Monter', '{"workflow":{"read":true,"start":true,"execute":true},"forms":{"read":true,"update":true,"complete":true}}'),
      (6, 'Administrator', '{"all":true}'), (7, 'Bez uprawnień', '{}')`);
    await source.query(`INSERT INTO users (id, username, active, role_id) VALUES (1,'monter',true,5),(2,'admin',true,6),(3,'obcy',true,5),(4,'funkcyjny',true,7)`);
    await source.query(`INSERT INTO task_types (id, code, configuration) VALUES (3,'CCTV','{}')`);
    await source.query(`INSERT INTO tasks (id, task_type_id) VALUES (10,3)`);
    await source.query(`INSERT INTO contracts (id, project_manager_id) VALUES (10,1)`);
    await source.query(`INSERT INTO devices (id, task_id) VALUES (10,10)`);
    await source.query(`INSERT INTO task_assignments (task_id,user_id,assigned_at) VALUES (10,1,now())`);
    await source.query(`INSERT INTO workflow_definitions (id,key,name,subject_type,task_type_ids) VALUES (1,'test','Proces testowy','TASK',ARRAY[3])`);
    await source.query(`INSERT INTO workflow_versions (id,definition_id,version,status,published_at) VALUES (1,1,1,'PUBLISHED',now())`);
    await source.query(`INSERT INTO workflow_steps (id,version_id,key,name,sort_order,assignee_type,assignee_ref) VALUES
      (1,1,'s1','Etap pierwszy',1,'USER','1'),(2,1,'s2','Etap drugi',2,'USER','1'),(3,1,'s3','Etap trzeci',3,'USER','1')`);
    bus = new DomainEventBus();
    events = [];
    for (const type of ['WORKFLOW_STARTED', 'STEP_ENTERED', 'STEP_COMPLETED', 'WORKFLOW_COMPLETED', 'WORKFLOW_FORCED', 'WORKFLOW_CANCELLED']) {
      bus.subscribe(type, event => { events.push(event); });
    }
    service = new WorkflowInstanceService(source, bus);
    domainEventBus.clear();
  });

  function token(userId = 1) {
    return generateAccessToken({ userId, username: 'test', role: 'test' }, `runtime-test-${userId}`);
  }

  function api(method: 'get' | 'post', path: string, userId = 1, body?: unknown) {
    const operation = request(app)[method](`/api/workflow-instances${path}`).set('Authorization', ['Bearer', token(userId)].join(' '));
    return body === undefined ? operation : operation.send(body as object);
  }

  const start = () => service.start({ definitionId: 1, subjectId: 10 }, executor);

  async function addForm(settings: Record<string, unknown> = {}, invalid = false, resultType = 'PASS_FAIL', systemData = false) {
    await source.query(`INSERT INTO form_templates (id,key,name,procedure_type) VALUES (1,'odbior','Odbiór','FIELD_INSTALLATION')`);
    await source.query(`INSERT INTO form_template_versions (id,template_id,version,status,published_at,title,kind,procedure_type,settings)
      VALUES (1,1,1,'DRAFT',NULL,'Odbiór','FORM','FIELD_INSTALLATION',$1)`, [settings]);
    await source.query(`INSERT INTO form_sections (id,template_version_id,key,title,sort_order) VALUES (1,1,'main','Wynik',1)`);
    await source.query(`INSERT INTO form_field_definitions (id,template_version_id,section_id,key,label,field_type,required,sort_order,options)
      VALUES (1,1,1,'result','Wynik',$1,true,1,$2)`, [resultType, resultType === 'RADIO' ? { values: ['PASS', 'FAIL'] } : {}]);
    if (invalid) await source.query(`UPDATE form_field_definitions SET field_type='BOM_TABLE', options='{}' WHERE id=1`);
    if (systemData) await source.query(`
      INSERT INTO form_field_definitions (id,template_version_id,section_id,key,label,field_type,required,sort_order,options) VALUES
      (2,1,1,'task_number','Numer zadania','DATA',false,2,'{"source":"task.number","mode":"readonly","valueType":"string"}'),
      (3,1,1,'contract_number','Numer kontraktu','DATA',false,3,'{"source":"contract.number","mode":"readonly","valueType":"string"}')
    `);
    await source.query(`UPDATE form_template_versions SET status='PUBLISHED', published_at=now() WHERE id=1`);
    await source.query(`UPDATE workflow_steps SET form_template_id=1 WHERE id=1`);
  }

  it('migruje daty timestamptz, chroni częściowy indeks RUNNING i przypięcie wersji', async () => {
    const rolesBefore = await source.query(`SELECT id, permissions FROM roles ORDER BY id`);
    const runner = source.createQueryRunner();
    await runner.connect();
    try {
      await new CreateWorkflowInstances1793647200000().up(runner);
    } finally {
      await runner.release();
    }
    expect(await source.query(`SELECT id, permissions FROM roles ORDER BY id`)).toEqual(rolesBefore);
    expect(rolesBefore.find((role: { id: number }) => role.id === 7).permissions).toEqual({});
    expect((await api('post', '/', 4, { definitionId: 1, subjectId: 10 })).status).toBe(403);
    const [subjectIndex] = await source.query(`SELECT indexdef FROM pg_indexes WHERE schemaname=$1 AND indexname='idx_workflow_instances_subject'`, [schema]);
    expect(subjectIndex.indexdef).toContain('(subject_type, subject_id)');
    const dates = await source.query(`SELECT data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name IN ('workflow_instances','workflow_step_runs') AND column_name LIKE '%_at'`, [schema]);
    expect(dates.length).toBeGreaterThan(5);
    expect(dates.every((row: { data_type: string }) => row.data_type === 'timestamp with time zone')).toBe(true);
    await start();
    await expect(source.query(`INSERT INTO workflow_instances (definition_id,version_id,subject_type,subject_id) VALUES (1,1,'TASK',10)`)).rejects.toMatchObject({ driverError: { code: '23505' } });
    await source.query(`INSERT INTO workflow_definitions (id,key,name,subject_type) VALUES (2,'obcy','Obcy','DEVICE')`);
    await expect(source.query(`INSERT INTO workflow_instances (definition_id,version_id,subject_type,subject_id) VALUES (2,1,'DEVICE',10)`)).rejects.toMatchObject({ driverError: { code: '23503' } });
  });

  it('serializuje dwa równoczesne ukończenia: tylko jedno przechodzi i emituje zdarzenie', async () => {
    const instance = await start();
    // Blokada zewnętrzna zapewnia, że oba żądania odczytają ten sam etap przed oczekiwaniem.
    const blocker = source.createQueryRunner();
    await blocker.connect();
    await blocker.startTransaction();
    await blocker.query(`SELECT id FROM workflow_instances WHERE id=$1 FOR UPDATE`, [instance.id]);
    const first = service.complete(instance.id, executor);
    const second = service.complete(instance.id, executor);
    const both = Promise.allSettled([first, second]);
    for (let attempt = 0; attempt < 100; attempt++) {
      const [{ count }] = await source.query(`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%workflow_instances%'`);
      if (count >= 2) break;
      await new Promise(resolve => setTimeout(resolve, 10));
      if (attempt === 99) throw new Error('Dwa żądania nie oczekują na blokadę');
    }
    await blocker.commitTransaction();
    await blocker.release();
    const results = await both;
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(result => result.status === 'rejected')).toMatchObject({ reason: { status: 409 } });
    expect((await service.getById(instance.id, executor)).history).toHaveLength(2);
    expect(events.filter(event => event.type === 'STEP_COMPLETED')).toHaveLength(1);
    expect(events.filter(event => event.type === 'STEP_ENTERED')).toHaveLength(2);
  });

  it('obsługuje HTTP: uruchomienie, moje etapy, filtry, zły wykonawca 403, historia i terminal', async () => {
    expect((await request(app).get('/api/workflow-instances')).status).toBe(401);
    const created = await api('post', '/', 1, { definitionId: 1, subjectId: 10 });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect((await api('get', '/my-steps')).body.data).toHaveLength(1);
    expect((await api('get', '/my-steps', 3)).body.data).toHaveLength(0);
    expect((await api('get', '/?definitionId=1&status=RUNNING&step=s1&subjectType=TASK&subjectId=10&overdue=false')).body.data).toHaveLength(1);
    expect((await api('get', '/?overdue=tak')).status).toBe(400);
    expect((await api('post', `/${id}/steps/current/complete`, 3)).status).toBe(403);
    for (let i = 0; i < 3; i++) expect((await api('post', `/${id}/steps/current/complete`)).status).toBe(200);
    const result = await api('get', `/${id}`);
    expect(result.body.data.status).toBe('COMPLETED');
    expect(result.body.data.history).toHaveLength(3);
    expect((await api('post', `/${id}/steps/current/complete`)).status).toBe(409);
  });

  it('wymusza i anuluje przez HTTP tylko z uprawnieniem oraz uzasadnieniem', async () => {
    const instance = await start();
    expect((await api('post', `/${instance.id}/force`, 2, { targetStepKey: 's3' })).status).toBe(400);
    expect((await api('post', `/${instance.id}/force`, 1, { targetStepKey: 's3', reason: 'Awaria' })).status).toBe(403);
    expect((await api('post', `/${instance.id}/force`, 2, { targetStepKey: 's3', reason: 'Awaria' })).body.data.history[0].outcome).toBe('FORCED');
    expect((await api('post', `/${instance.id}/cancel`, 2, { reason: 'Rezygnacja' })).body.data.status).toBe('CANCELLED');
    const audit = await source.query(`SELECT event_type FROM audit_logs WHERE event_type IN ('WORKFLOW_STEP_FORCED','WORKFLOW_INSTANCE_CANCELLED')`);
    expect(audit).toHaveLength(2);
  });

  it('honoruje start-only i read-only bez pośredniego nadawania execute przez API', async () => {
    await source.query(`UPDATE roles SET permissions='{"workflow":{"start":true}}' WHERE id=7`);
    const created = await api('post', '/', 4, { definitionId: 1, subjectId: 10 });
    expect(created.status).toBe(201);
    expect((await api('get', '/my-steps', 4)).status).toBe(403);
    expect((await api('post', `/${created.body.data.id}/steps/current/complete`, 4)).status).toBe(403);
    await source.query(`UPDATE roles SET permissions='{"workflow":{"read":true}}' WHERE id=5`);
    const steps = await api('get', '/my-steps');
    expect(steps.status).toBe(200);
    expect(steps.body.data).toHaveLength(1);
    expect((await api('post', `/${created.body.data.id}/steps/current/complete`)).status).toBe(403);
  });

  it('odpowiada przez rzeczywisty serwer HTTP i utrwala ukończony etap w PostgreSQL', async () => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    try {
      const address = server.address() as { port: number };
      const response = await fetch(`http://127.0.0.1:${address.port}/api/workflow-instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: ['Bearer', token()].join(' ') },
        body: JSON.stringify({ definitionId: 1, subjectId: 10 }),
      });
      expect(response.status).toBe(201);
      const body = await response.json() as { data: { id: number } };
      const completion = await fetch(`http://127.0.0.1:${address.port}/api/workflow-instances/${body.data.id}/steps/current/complete`, {
        method: 'POST', headers: { Authorization: ['Bearer', token()].join(' ') },
      });
      expect(completion.status).toBe(200);
      expect(await source.getRepository(WorkflowStepRun).countBy({ instanceId: body.data.id, outcome: 'COMPLETED' })).toBe(1);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });

  it('wykonuje warunkowy powrót z formularzem FAIL, nową próbę i przejście PASS bez omijania FormRules', async () => {
    await addForm({}, false, 'RADIO');
    await source.query(`INSERT INTO workflow_transitions (version_id,from_step_key,to_step_key,condition,priority)
      VALUES (1,'s1','s1','{"field":"result","operator":"equals","value":"FAIL"}',1)`);
    const forms = new FormInstanceService(source);
    const instance = await start();
    const firstId = instance.currentStepRun!.formInstanceId!;
    await expect(service.complete(instance.id, administrator)).rejects.toMatchObject({ status: 409 });
    await forms.saveResponses(firstId, { result: 'FAIL' }, 1);
    await forms.complete(firstId, 1);
    const retry = await service.complete(instance.id, executor);
    expect(retry.currentStepRun).toMatchObject({ stepKey: 's1', attempt: 2 });
    expect(retry.history[0].outcome).toBe('RETURNED');
    const secondId = retry.currentStepRun!.formInstanceId!;
    expect(secondId).not.toBe(firstId);
    await forms.saveResponses(secondId, { result: 'PASS' }, 1);
    await forms.complete(secondId, 1);
    expect((await service.complete(instance.id, executor)).currentStepKey).toBe('s2');
  });

  it('wymaga zatwierdzenia formularza także dla administratora', async () => {
    await addForm({ approvalRequired: true });
    const instance = await start();
    const formId = instance.currentStepRun!.formInstanceId!;
    const forms = new FormInstanceService(source);
    await forms.saveResponses(formId, { result: 'PASS' }, 1);
    await forms.complete(formId, 1);
    await expect(service.complete(instance.id, administrator)).rejects.toMatchObject({ status: 409 });
    await new FormApprovalService(source).approve(formId, 2);
    expect((await service.complete(instance.id, executor)).currentStepKey).toBe('s2');
  });

  it.each(['CONTRACT', 'DEVICE'] as const)('tworzy i kończy formularz etapu dla przedmiotu %s', async subjectType => {
    await addForm();
    await source.query(`UPDATE workflow_definitions SET subject_type=$1, task_type_ids='{}' WHERE id=1`, [subjectType]);
    const instance = await service.start({ definitionId: 1, subjectId: 10, subjectType }, executor);
    const form = await source.getRepository(FormInstance).findOneByOrFail({ id: instance.currentStepRun!.formInstanceId! });
    expect(form).toMatchObject({ templateVersionId: 1, [`${subjectType.toLowerCase()}Id`]: 10 });
    const forms = new FormInstanceService(source);
    await forms.saveResponses(form.id, { result: 'PASS' }, 1);
    await forms.complete(form.id, 1);
    expect(await service.complete(instance.id, executor)).toMatchObject({ subjectType, currentStepKey: 's2' });
  });

  it.each(['TASK', 'DEVICE'] as const)('zapisuje snapshoty DATA zadania i kontraktu oraz audyt atomowo dla %s', async subjectType => {
    await addForm({}, false, 'PASS_FAIL', true);
    await source.query(`UPDATE tasks SET task_number='Z00100001', contract_id=10 WHERE id=10`);
    await source.query(`UPDATE contracts SET contract_number='R0010001_A' WHERE id=10`);
    if (subjectType === 'DEVICE') await source.query(`UPDATE workflow_definitions SET subject_type='DEVICE', task_type_ids='{}' WHERE id=1`);
    const transaction = jest.spyOn(source, 'transaction');
    let instance: Awaited<ReturnType<typeof start>>;
    try {
      instance = await service.start({ definitionId: 1, subjectId: 10, subjectType }, executor);
      expect(transaction).toHaveBeenCalledTimes(1);
    } finally {
      transaction.mockRestore();
    }
    const formId = instance!.currentStepRun!.formInstanceId!;
    const form = await source.getRepository(FormInstance).findOneByOrFail({ id: formId });
    expect(form).toMatchObject({ taskId: 10, contractId: 10, ...(subjectType === 'DEVICE' ? { deviceId: 10 } : {}) });
    const snapshots = await source.getRepository(FormFieldValue).find({ where: { instanceId: formId }, order: { fieldDefinitionId: 'ASC' } });
    expect(snapshots.map(value => [value.fieldDefinitionId, value.value])).toEqual([[2, 'Z00100001'], [3, 'R0010001_A']]);
    expect(await source.query(`SELECT event_type FROM audit_logs WHERE event_type IN
      ('FORM_DATA_SNAPSHOT_CREATED','FORM_INSTANCE_CREATED','WORKFLOW_STEP_ENTERED') ORDER BY id`)).toEqual([
      { event_type: 'FORM_DATA_SNAPSHOT_CREATED' }, { event_type: 'FORM_INSTANCE_CREATED' }, { event_type: 'WORKFLOW_STEP_ENTERED' },
    ]);
  });

  it('wycofuje snapshoty DATA i ich audyt, gdy zapis podejścia nie powiedzie się po utworzeniu formularza', async () => {
    await addForm({}, false, 'PASS_FAIL', true);
    await source.query(`UPDATE tasks SET task_number='Z00100001', contract_id=10 WHERE id=10`);
    await source.query(`UPDATE contracts SET contract_number='R0010001_A' WHERE id=10`);
    await source.query(`ALTER TABLE workflow_step_runs ADD CONSTRAINT test_reject_step CHECK (step_key <> 's1')`);
    await expect(start()).rejects.toMatchObject({ driverError: { code: '23514' } });
    expect(await source.getRepository(WorkflowInstance).count()).toBe(0);
    expect(await source.getRepository(FormInstance).count()).toBe(0);
    expect(await source.getRepository(FormFieldValue).count()).toBe(0);
    expect(await source.query(`SELECT id FROM audit_logs`)).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it('nie omija blokady PASS_FAIL ani wymaganych odpowiedzi formularza', async () => {
    await addForm();
    const instance = await start();
    const formId = instance.currentStepRun!.formInstanceId!;
    const forms = new FormInstanceService(source);
    await expect(forms.complete(formId, 1)).rejects.toMatchObject({ code: 'INVALID_RESPONSES' });
    await forms.saveResponses(formId, { result: 'FAIL' }, 1);
    await expect(forms.complete(formId, 1)).rejects.toMatchObject({ code: 'INVALID_RESPONSES' });
    await expect(service.complete(instance.id, administrator)).rejects.toMatchObject({ status: 409 });
    expect((await service.getById(instance.id, executor)).currentStepKey).toBe('s1');
  });

  it('pozostawia instancję na v1 po publikacji v2 i przypina formularz do wersji z wejścia', async () => {
    await addForm();
    const instance = await start();
    await source.getRepository(WorkflowVersion).update(1, { status: 'SUPERSEDED' });
    await source.query(`INSERT INTO workflow_versions (id,definition_id,version,status,published_at) VALUES (2,1,2,'PUBLISHED',now())`);
    await source.query(`INSERT INTO workflow_steps (id,version_id,key,name,sort_order,assignee_type,assignee_ref) VALUES (4,2,'v2','Nowy etap',1,'USER','1')`);
    await source.query(`INSERT INTO form_template_versions (id,template_id,version,status,published_at,title,kind,procedure_type)
      VALUES (2,1,2,'PUBLISHED',now(),'Nowy formularz','FORM','FIELD_INSTALLATION')`);
    const form = await source.getRepository(FormInstance).findOneByOrFail({ id: instance.currentStepRun!.formInstanceId! });
    expect(form.templateVersionId).toBe(1);
    const forms = new FormInstanceService(source);
    await forms.saveResponses(form.id, { result: 'PASS' }, 1);
    await forms.complete(form.id, 1);
    expect(await service.complete(instance.id, executor)).toMatchObject({ versionId: 1, currentStepKey: 's2' });
  });

  it('funkcja nadaje execute, moje etapy i dostęp do formularza tylko aktywnym członkom', async () => {
    await addForm();
    await source.query(`INSERT INTO function_groups (id,key,name,permissions) VALUES (1,'INSTALLERS','Monterzy',
      '{"workflow":{"execute":true,"read":true},"forms":{"read":true,"update":true,"complete":true}}')`);
    await source.query(`INSERT INTO user_function_groups (user_id,function_group_id,valid_from) VALUES (4,1,now()-interval '1 hour')`);
    await source.getRepository(WorkflowStep).update(1, { assigneeType: 'FUNCTION_GROUP', assigneeRef: 'INSTALLERS' });
    expect((await EffectivePermissionsService.get(4))?.permissions.workflow?.execute).toBe(true);
    expect((await api('post', '/', 4, { definitionId: 1, subjectId: 10 })).status).toBe(403);
    const instance = await start();
    expect((await api('get', '/my-steps', 4)).body.data).toHaveLength(1);
    const formId = instance.currentStepRun!.formInstanceId!;
    const response = await request(app).put(`/api/forms/instances/${formId}/values`)
      .set('Authorization', ['Bearer', token(4)].join(' ')).send({ responses: { result: 'PASS' } });
    expect(response.status).toBe(200);
    expect((await request(app).post(`/api/forms/instances/${formId}/complete`).set('Authorization', ['Bearer', token(4)].join(' '))).status).toBe(200);
    await source.query(`UPDATE user_function_groups SET valid_to=now() WHERE user_id=4`);
    expect((await api('get', '/my-steps', 4)).status).toBe(403);
    expect((await api('post', `/${instance.id}/steps/current/complete`, 4)).status).toBe(403);
    expect((await request(app).get(`/api/forms/instances/${formId}`).set('Authorization', ['Bearer', token(4)].join(' ')))).toMatchObject({ status: 403 });
  });

  it.each(['ROLE', 'BRIGADE'] as const)('moje etapy i formularze honorują członkostwo %s', async type => {
    await addForm();
    await source.query(`INSERT INTO brigades (id,active) VALUES (8,true)`);
    await source.query(`INSERT INTO brigade_members (brigade_id,user_id,active,valid_from) VALUES (8,1,true,current_date)`);
    await source.getRepository(WorkflowStep).update(1, { assigneeType: type, assigneeRef: type === 'ROLE' ? '5' : '8' });
    const instance = await start();
    expect((await api('get', '/my-steps')).body.data).toHaveLength(1);
    const formId = instance.currentStepRun!.formInstanceId!;
    expect((await request(app).put(`/api/forms/instances/${formId}/values`).set('Authorization', ['Bearer', token()].join(' ')).send({ responses: { result: 'PASS' } }))).toMatchObject({ status: 200 });
    if (type === 'BRIGADE') {
      await source.query(`UPDATE brigades SET active=false WHERE id=8`);
      expect((await api('get', '/my-steps')).body.data).toHaveLength(0);
      expect((await api('post', `/${instance.id}/steps/current/complete`)).status).toBe(403);
    }
  });

  it('uruchamia przypięte łańcuchy STEP_ENTERED i STEP_COMPLETED raz, także przy powtórnym dostarczeniu', async () => {
    const action = jest.fn(async () => ({ status: 'OK' as const, message: 'Wykonano', output: {} }));
    const registry = new AutomationRegistry();
    registry.register({ key: 'test_step', label: 'Test', description: 'Test', category: 'Test', params: [], requiredPermission: { module: 'workflow', action: 'execute' }, supportsDryRun: true, run: action });
    const execution = new AutomationExecutionService({ registry, store: new TypeOrmAutomationStore(source) });
    for (const type of ['STEP_ENTERED', 'STEP_COMPLETED']) bus.subscribe(type, event => execution.handleEvent(event));
    await source.query(`INSERT INTO automation_chains (owner_type,owner_id,event_type,steps,created_by) VALUES
      ('WORKFLOW_STEP',1,'STEP_ENTERED','[{"action":"test_step","params":{}}]',1),
      ('WORKFLOW_STEP',1,'STEP_COMPLETED','[{"action":"test_step","params":{}}]',1)`);
    const instance = await start();
    await service.complete(instance.id, executor);
    const entered = events.find(event => event.type === 'STEP_ENTERED')!;
    const completed = events.find(event => event.type === 'STEP_COMPLETED')!;
    expect(ownerFromEvent(entered)).toEqual({ ownerType: 'WORKFLOW_STEP', ownerId: 1 });
    await execution.handleEvent(entered);
    await execution.handleEvent(completed);
    expect(action).toHaveBeenCalledTimes(2);
    expect(await source.getRepository(AutomationRun).count()).toBe(2);
  });

  it('cofa instancję, formularze i audyt bez publikacji zdarzeń przy błędzie wejścia', async () => {
    await addForm({}, true);
    await expect(start()).rejects.toMatchObject({ status: 400 });
    expect(await source.getRepository(WorkflowInstance).count()).toBe(0);
    expect(await source.getRepository(FormInstance).count()).toBe(0);
    expect(events).toHaveLength(0);
  });

  it('wycofuje i ponawia migrację realizacji bez usuwania historii formularzy', async () => {
    await addForm();
    const instance = await start();
    await service.cancel(instance.id, { reason: 'Próba migracji' }, administrator);
    const runner = source.createQueryRunner();
    await runner.connect();
    try {
      const migration = new CreateWorkflowInstances1793647200000();
      await migration.down(runner);
      expect(await source.getRepository(FormInstance).count()).toBe(1);
      await migration.up(runner);
      expect(await source.getRepository(WorkflowInstance).count()).toBe(0);
    } finally {
      await runner.release();
    }
  });

});

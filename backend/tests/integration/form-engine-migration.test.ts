import { DataSource, QueryRunner } from 'typeorm';
import { AppDataSource } from '../../src/config/database';
import { CreateFormChecklistEngine1790971200000 } from '../../src/migrations/20261002_create_form_checklist_engine';
import { FormTemplate } from '../../src/entities/FormTemplate';
import { FormTemplateVersion } from '../../src/entities/FormTemplateVersion';
import { FormInstance } from '../../src/entities/FormInstance';
import { FormFieldValue } from '../../src/entities/FormFieldValue';
import { FormKind, FormProcedureType } from '../../src/entities/FormTypes';

// Opt in with an isolated PostgreSQL database; each run owns only its temporary schema.
const describePostgres = process.env.FORM_ENGINE_TEST_DATABASE_URL ? describe : describe.skip;

describePostgres('Form Engine PostgreSQL migration', () => {
  let source: DataSource;
  let runner: QueryRunner;
  const schema = `form_engine_test_${process.pid}`;
  const migration = new CreateFormChecklistEngine1790971200000();
  const procedure = FormProcedureType.DEVICE_PRECONFIGURATION;
  let templateCounter = 0;

  beforeAll(async () => {
    source = new DataSource({
      type: 'postgres',
      url: process.env.FORM_ENGINE_TEST_DATABASE_URL,
      schema,
      entities: AppDataSource.options.entities,
      migrations: [CreateFormChecklistEngine1790971200000],
      synchronize: false,
      extra: { options: `-c search_path=${schema}` }
    });
    await source.initialize();
    runner = source.createQueryRunner();
    await runner.connect();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    // Only the pre-existing FK targets are needed to exercise this migration.
    for (const table of [
      'users', 'brigades', 'contracts', 'tasks', 'subsystem_tasks', 'assets',
      'task_generated_bom_items', 'workflow_generated_bom_items', 'documents', 'photos'
    ]) {
      await runner.query(`CREATE TABLE ${table} (id INTEGER PRIMARY KEY)`);
      await runner.query(`INSERT INTO ${table} (id) VALUES (1)`);
    }
    await runner.query('CREATE TABLE devices (id INTEGER PRIMARY KEY, installed_asset_id INTEGER)');
    await runner.query('INSERT INTO devices (id) VALUES (1)');
    expect(await source.runMigrations()).toHaveLength(1);
    expect(await source.runMigrations()).toHaveLength(0);
  });

  afterAll(async () => {
    if (runner) {
      await runner.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await runner.release();
    }
    if (source?.isInitialized) await source.destroy();
  });

  beforeEach(async () => {
    await runner.startTransaction();
  });

  afterEach(async () => {
    if (runner?.isTransactionActive) await runner.rollbackTransaction();
  });

  async function draft(version = 1, templateId?: number) {
    if (!templateId) {
      const template = await runner.manager.getRepository(FormTemplate).save({
        key: `test_${++templateCounter}`, name: 'Test', kind: FormKind.CHECKLIST, procedureType: procedure
      });
      templateId = template.id;
    }
    return runner.manager.getRepository(FormTemplateVersion).save({
      templateId, version, title: 'Test version', kind: FormKind.CHECKLIST, procedureType: procedure
    });
  }

  async function definition(versionId: number) {
    const [section] = await runner.query(
      `INSERT INTO form_sections (template_version_id, key, title) VALUES ($1, 'section', 'Section') RETURNING id`,
      [versionId]
    );
    const [field] = await runner.query(
      `INSERT INTO form_field_definitions (template_version_id, section_id, key, label, field_type)
       VALUES ($1, $2, 'field', 'Field', 'future_custom_type') RETURNING id`,
      [versionId, section.id]
    );
    const [trigger] = await runner.query(
      `INSERT INTO form_triggers (template_version_id, event_type) VALUES ($1, 'device.created') RETURNING id`,
      [versionId]
    );
    const [rule] = await runner.query(
      `INSERT INTO form_assignment_rules (template_version_id, trigger_id, assigned_team_id)
       VALUES ($1, $2, 1) RETURNING id`,
      [versionId, trigger.id]
    );
    return { sectionId: section.id, fieldId: field.id, triggerId: trigger.id, ruleId: rule.id };
  }

  async function publish(versionId: number) {
    await runner.query(
      `UPDATE form_template_versions SET status = 'PUBLISHED', published_at = now() WHERE id = $1`,
      [versionId]
    );
  }

  async function rejects(sql: string, parameters: unknown[] = [], code = '23514') {
    await runner.query('SAVEPOINT expected_failure');
    await expect(runner.query(sql, parameters)).rejects.toMatchObject({ driverError: { code } });
    await runner.query('ROLLBACK TO SAVEPOINT expected_failure');
    await runner.query('RELEASE SAVEPOINT expected_failure');
  }

  it('enforces unique positive version numbers and coherent publication metadata', async () => {
    const version = await draft();
    await rejects(`UPDATE form_template_versions SET status = 'PUBLISHED' WHERE id = $1`, [version.id]);
    await rejects(`UPDATE form_template_versions SET published_at = now() WHERE id = $1`, [version.id]);
    await rejects(`UPDATE form_template_versions SET status = 'OTHER' WHERE id = $1`, [version.id]);
    await rejects(`UPDATE form_template_versions SET version = 0 WHERE id = $1`, [version.id]);
    await rejects(
      `INSERT INTO form_template_versions (template_id, version, title, kind, procedure_type)
       VALUES ($1, 1, 'duplicate', 'FORM', $2)`,
      [version.templateId, procedure], '23505'
    );
  });

  it('allows draft edits and freezes the entire aggregate on publication, including moves', async () => {
    const version = await draft();
    const ids = await definition(version.id);
    const next = await draft(2, version.templateId);
    await runner.query(`UPDATE form_field_definitions SET validation = '{"min":1}' WHERE id = $1`, [ids.fieldId]);
    await runner.query(`UPDATE form_sections SET title = 'Updated' WHERE id = $1`, [ids.sectionId]);
    await publish(version.id);
    await rejects(`UPDATE form_template_versions SET title = 'Changed' WHERE id = $1`, [version.id]);
    await rejects(`UPDATE form_template_versions SET status = 'DRAFT', published_at = NULL WHERE id = $1`, [version.id]);
    await rejects(`DELETE FROM form_template_versions WHERE id = $1`, [version.id]);
    for (const [table, id] of [
      ['form_sections', ids.sectionId], ['form_field_definitions', ids.fieldId],
      ['form_triggers', ids.triggerId], ['form_assignment_rules', ids.ruleId]
    ] as const) {
      await rejects(`UPDATE ${table} SET template_version_id = $1 WHERE id = $2`, [next.id, id]);
      await rejects(`DELETE FROM ${table} WHERE id = $1`, [id]);
      await rejects(`TRUNCATE ${table} CASCADE`);
    }
    await rejects(`INSERT INTO form_sections (template_version_id, key, title) VALUES ($1, 'extra', 'Extra')`, [version.id]);
    await rejects(
      `INSERT INTO form_field_definitions (template_version_id, section_id, key, label, field_type)
       VALUES ($1, $2, 'extra', 'Extra', 'text')`, [version.id, ids.sectionId]
    );
    await rejects(`INSERT INTO form_triggers (template_version_id, event_type) VALUES ($1, 'new')`, [version.id]);
    await rejects(`INSERT INTO form_assignment_rules (template_version_id, assigned_user_id) VALUES ($1, 1)`, [version.id]);
    const nextIds = await definition(next.id);
    await rejects(`UPDATE form_sections SET template_version_id = $1 WHERE id = $2`, [version.id, nextIds.sectionId]);
    await rejects(`DELETE FROM form_templates WHERE id = $1`, [version.templateId], '23503');
  });

  it('rejects cross-version sections and triggers even in drafts', async () => {
    const version = await draft();
    const ids = await definition(version.id);
    const next = await draft(2, version.templateId);
    await rejects(
      `INSERT INTO form_field_definitions (template_version_id, section_id, key, label, field_type)
       VALUES ($1, $2, 'new', 'New', 'text')`, [next.id, ids.sectionId], '23503'
    );
    await rejects(
      `INSERT INTO form_assignment_rules (template_version_id, trigger_id, assigned_user_id) VALUES ($1, $2, 1)`,
      [next.id, ids.triggerId], '23503'
    );
    await rejects(`INSERT INTO form_assignment_rules (template_version_id) VALUES ($1)`, [next.id]);
  });

  it('pins instances to a published version and keeps historical answers when a new version appears', async () => {
    const version = await draft();
    const ids = await definition(version.id);
    await rejects(`INSERT INTO form_instances (template_version_id) VALUES ($1)`, [version.id]);
    await publish(version.id);
    const instance = await runner.manager.getRepository(FormInstance).save({
      templateVersionId: version.id, deviceId: 1, objectId: 1, taskId: 1, contractId: 1,
      assignedTeamId: 1, bomItemId: 1
    });
    const answer = await runner.manager.getRepository(FormFieldValue).save({
      instanceId: instance.id, templateVersionId: version.id, fieldDefinitionId: ids.fieldId,
      value: { verified: true, measurements: [12, 13] }, documents: [{ id: 1 }], photos: [{ id: 1 }]
    });
    const next = await draft(2, version.templateId);
    const nextIds = await definition(next.id);
    await publish(next.id);
    await rejects(`UPDATE form_instances SET template_version_id = $1 WHERE id = $2`, [next.id, instance.id]);
    await rejects(
      `INSERT INTO form_field_values (instance_id, template_version_id, field_definition_id, value)
       VALUES ($1, $2, $3, 'true')`, [instance.id, version.id, nextIds.fieldId], '23503'
    );
    await rejects(
      `UPDATE form_field_values SET template_version_id = $1, field_definition_id = $2 WHERE id = $3`,
      [next.id, nextIds.fieldId, answer.id], '23503'
    );
    await rejects(
      `INSERT INTO form_field_values (instance_id, template_version_id, field_definition_id)
       VALUES ($1, $2, $3)`, [instance.id, version.id, ids.fieldId], '23505'
    );
    await rejects(`UPDATE form_instances SET workflow_bom_item_id = 1 WHERE id = $1`, [instance.id]);
    const loaded = await runner.manager.getRepository(FormInstance).findOneOrFail({
      where: { id: instance.id },
      relations: { templateVersion: { sections: { fields: true } }, values: true }
    });
    expect(loaded.templateVersion.version).toBe(1);
    expect(loaded.templateVersion.sections[0].fields[0].fieldType).toBe('future_custom_type');
    expect(loaded.values[0].value).toEqual({ verified: true, measurements: [12, 13] });
    expect(await runner.query(`SELECT * FROM form_value_documents`)).toEqual([{ field_value_id: answer.id, document_id: 1 }]);
    expect(await runner.query(`SELECT * FROM form_value_photos`)).toEqual([{ field_value_id: answer.id, photo_id: 1 }]);
    expect(await runner.query(`SELECT installed_asset_id FROM devices WHERE id = 1`)).toEqual([{ installed_asset_id: null }]);
  });

  it('supports all three procedures and rejects unknown kinds and procedures', async () => {
    const version = await draft();
    for (const procedureType of Object.values(FormProcedureType)) {
      await runner.query(`UPDATE form_templates SET procedure_type = $1 WHERE id = $2`, [procedureType, version.templateId]);
      await runner.query(`UPDATE form_template_versions SET procedure_type = $1 WHERE id = $2`, [procedureType, version.id]);
    }
    await rejects(`UPDATE form_templates SET kind = 'OTHER' WHERE id = $1`, [version.templateId]);
    await rejects(`UPDATE form_templates SET procedure_type = 'ASSEMBLY' WHERE id = $1`, [version.templateId]);
    await rejects(`UPDATE form_template_versions SET procedure_type = 'ASSEMBLY' WHERE id = $1`, [version.id]);
  });

  it('records multiple approval steps and rounds without rewriting past decisions', async () => {
    const version = await draft();
    await publish(version.id);
    const instance = await runner.manager.getRepository(FormInstance).save({ templateVersionId: version.id });
    for (const [step, round] of [[1, 1], [2, 1], [1, 2]]) {
      await runner.query(
        `INSERT INTO form_approvals (instance_id, step_order, round, decision, decided_by_id)
         VALUES ($1, $2, $3, 'APPROVED', 1)`, [instance.id, step, round]
      );
    }
    await rejects(`UPDATE form_approvals SET decision = 'REJECTED' WHERE instance_id = $1`, [instance.id]);
    await rejects(`DELETE FROM form_approvals WHERE instance_id = $1`, [instance.id]);
    await rejects(`TRUNCATE form_approvals`);
    await rejects(
      `INSERT INTO form_approvals (instance_id, step_order, decision, decided_by_id)
       VALUES ($1, 0, 'APPROVED', 1)`, [instance.id]
    );
    expect(await runner.query(`SELECT count(*)::int AS count FROM form_approvals`)).toEqual([{ count: 3 }]);
  });

  it('serializes a concurrent definition edit with publication and rechecks the published status', async () => {
    const version = await draft();
    const ids = await definition(version.id);
    await runner.commitTransaction();
    const editor = source.createQueryRunner();
    await editor.connect();
    let editResult: Promise<unknown> | undefined;
    try {
      await editor.startTransaction();
      await runner.startTransaction();
      await publish(version.id);
      const [{ pid }] = await editor.query('SELECT pg_backend_pid() AS pid');
      editResult = editor.query(`UPDATE form_sections SET title = 'Racing edit' WHERE id = $1`, [ids.sectionId])
        .catch(error => error);
      let blocked = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const [{ waiting }] = await runner.query(
          'SELECT cardinality(pg_blocking_pids($1)) > 0 AS waiting', [pid]
        );
        if (waiting) {
          blocked = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(blocked).toBe(true);
      await runner.commitTransaction();
      expect(await editResult).toMatchObject({ driverError: { code: '23514' } });
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      if (editResult) await editResult;
      if (editor.isTransactionActive) await editor.rollbackTransaction();
      await editor.release();
    }
    expect(await runner.query('SELECT title FROM form_sections WHERE id = $1', [ids.sectionId]))
      .toEqual([{ title: 'Section' }]);
  });

  it('rolls back only the new schema objects and can be reapplied', async () => {
    await migration.down(runner);
    expect(await runner.query(`SELECT to_regclass('form_templates') AS name`)).toEqual([{ name: null }]);
    expect(await runner.query(`SELECT id FROM devices`)).toEqual([{ id: 1 }]);
    expect(await runner.query(`SELECT count(*)::int AS count FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = $1 AND p.proname LIKE 'form_%'`,
    [schema])).toEqual([{ count: 0 }]);
    await migration.up(runner);
    expect((await draft()).version).toBe(1);
  });
});

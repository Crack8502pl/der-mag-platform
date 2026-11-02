import { DataSource, QueryRunner } from 'typeorm';
import { CreateWorkflowDefinitions1793643600000 } from '../../src/migrations/20261102_create_workflow_definitions';

const databaseUrl = process.env.FORM_ENGINE_TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Workflow definitions PostgreSQL migration', () => {
  let source: DataSource;
  let runner: QueryRunner;
  const schema = `workflow_migration_test_${process.pid}`;
  const migration = new CreateWorkflowDefinitions1793643600000();

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('Brak FORM_ENGINE_TEST_DATABASE_URL');
    source = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      schema,
      synchronize: false,
      extra: { options: `-c search_path=${schema}` },
    });
    await source.initialize();
    runner = source.createQueryRunner();
    await runner.connect();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query('CREATE TABLE users (id INTEGER PRIMARY KEY)');
    await runner.query(`
      CREATE TABLE task_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        configuration JSONB
      )
    `);
    await runner.query(`
      INSERT INTO task_types (code, configuration) VALUES
        ('SSP', '{"has_bom": true, "safetyCritical": false}'),
        ('SUG', '{"has_bom": false}'),
        ('SMW', '{"has_bom": true, "safetyCritical": true}'),
        ('CCTV', NULL)
    `);
    await migration.up(runner);
  });

  afterAll(async () => {
    if (runner) {
      await runner.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await runner.release();
    }
    if (source?.isInitialized) await source.destroy();
  });

  it('updates existing task types and preserves their previous configuration', async () => {
    const taskTypes = await runner.query(
      'SELECT code, configuration FROM task_types ORDER BY id',
    );

    expect(taskTypes).toEqual([
      { code: 'SSP', configuration: { has_bom: true, safetyCritical: true } },
      { code: 'SUG', configuration: { has_bom: false, safetyCritical: true } },
      { code: 'SMW', configuration: { has_bom: true, safetyCritical: false } },
      { code: 'CCTV', configuration: { safetyCritical: false } },
    ]);
    expect(await runner.query(
      'SELECT to_regclass($1) IS NOT NULL AS exists',
      [`${schema}.workflow_definitions`],
    )).toEqual([{ exists: true }]);
  });
});

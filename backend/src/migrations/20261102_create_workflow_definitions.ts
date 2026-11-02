import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkflowDefinitions1793643600000 implements MigrationInterface {
  name = 'CreateWorkflowDefinitions1793643600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE task_types
      SET configuration = COALESCE(configuration, '{}'::jsonb)
        || jsonb_build_object('safetyCritical', UPPER(code) IN ('SSP', 'SUG'))
      WHERE configuration IS NULL OR jsonb_typeof(configuration) = 'object';

      CREATE TABLE IF NOT EXISTS workflow_definitions (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        subject_type VARCHAR(20) NOT NULL,
        task_type_ids INTEGER[] NOT NULL DEFAULT '{}',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_workflow_definitions_key UNIQUE (key),
        CONSTRAINT fk_workflow_definitions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT chk_workflow_definitions_subject_type CHECK (subject_type IN ('TASK', 'CONTRACT', 'DEVICE')),
        CONSTRAINT chk_workflow_definitions_task_types CHECK (subject_type = 'TASK' OR cardinality(task_type_ids) = 0)
      );
      CREATE INDEX IF NOT EXISTS idx_workflow_definitions_task_type_ids ON workflow_definitions USING GIN (task_type_ids);

      CREATE TABLE IF NOT EXISTS workflow_versions (
        id SERIAL PRIMARY KEY,
        definition_id INTEGER NOT NULL,
        version INTEGER NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        author_id INTEGER,
        safety_critical BOOLEAN NOT NULL DEFAULT FALSE,
        allow_skip_purpose_audit BOOLEAN NOT NULL DEFAULT FALSE,
        review_config JSONB NOT NULL DEFAULT '{}'::jsonb,
        published_at TIMESTAMPTZ,
        published_by_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_workflow_versions_definition FOREIGN KEY (definition_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE,
        CONSTRAINT fk_workflow_versions_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_workflow_versions_published_by FOREIGN KEY (published_by_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT uq_workflow_versions_definition_version UNIQUE (definition_id, version),
        CONSTRAINT chk_workflow_versions_version CHECK (version > 0),
        CONSTRAINT chk_workflow_versions_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'SUPERSEDED')),
        CONSTRAINT chk_workflow_versions_publication CHECK (status NOT IN ('PUBLISHED', 'SUPERSEDED') OR published_at IS NOT NULL),
        CONSTRAINT chk_workflow_versions_review_config CHECK (jsonb_typeof(review_config) = 'object')
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_versions_one_published
        ON workflow_versions(definition_id) WHERE status = 'PUBLISHED';
      CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_versions_one_draft
        ON workflow_versions(definition_id) WHERE status = 'DRAFT';

      CREATE TABLE IF NOT EXISTS workflow_steps (
        id SERIAL PRIMARY KEY,
        version_id INTEGER NOT NULL,
        key VARCHAR(100) NOT NULL,
        name VARCHAR(200) NOT NULL,
        sort_order INTEGER NOT NULL,
        assignee_type VARCHAR(30),
        assignee_ref VARCHAR(100),
        form_template_id INTEGER,
        due_in_hours INTEGER,
        CONSTRAINT fk_workflow_steps_version FOREIGN KEY (version_id) REFERENCES workflow_versions(id) ON DELETE CASCADE,
        CONSTRAINT chk_workflow_steps_assignee_type
          CHECK (assignee_type IS NULL OR assignee_type IN ('ROLE', 'FUNCTION_GROUP', 'BRIGADE', 'USER', 'SUBJECT_ASSIGNEE')),
        CONSTRAINT chk_workflow_steps_due_in_hours CHECK (due_in_hours IS NULL OR due_in_hours > 0)
      );
      CREATE INDEX IF NOT EXISTS idx_workflow_steps_version ON workflow_steps(version_id, sort_order);

      CREATE TABLE IF NOT EXISTS workflow_transitions (
        id SERIAL PRIMARY KEY,
        version_id INTEGER NOT NULL,
        from_step_key VARCHAR(100) NOT NULL,
        to_step_key VARCHAR(100) NOT NULL,
        condition JSONB,
        priority INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT fk_workflow_transitions_version FOREIGN KEY (version_id) REFERENCES workflow_versions(id) ON DELETE CASCADE,
        CONSTRAINT chk_workflow_transitions_condition CHECK (condition IS NULL OR jsonb_typeof(condition) = 'object')
      );
      CREATE INDEX IF NOT EXISTS idx_workflow_transitions_version ON workflow_transitions(version_id, from_step_key, priority);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM automation_chains WHERE owner_type = 'WORKFLOW_STEP';
      DROP TABLE IF EXISTS workflow_transitions;
      DROP TABLE IF EXISTS workflow_steps;
      DROP TABLE IF EXISTS workflow_versions;
      DROP TABLE IF EXISTS workflow_definitions;
      UPDATE task_types SET configuration = configuration - 'safetyCritical'
      WHERE jsonb_typeof(configuration) = 'object';
    `);
  }
}

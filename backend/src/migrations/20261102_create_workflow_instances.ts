import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkflowInstances1793647200000 implements MigrationInterface {
  name = 'CreateWorkflowInstances1793647200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'workflow_versions'::regclass AND conname = 'uq_workflow_versions_id_definition') THEN
          ALTER TABLE workflow_versions ADD CONSTRAINT uq_workflow_versions_id_definition UNIQUE (id, definition_id);
        END IF;
      END $$;
      CREATE TABLE IF NOT EXISTS workflow_instances (
        id SERIAL PRIMARY KEY,
        definition_id INTEGER NOT NULL REFERENCES workflow_definitions(id) ON DELETE RESTRICT,
        version_id INTEGER NOT NULL,
        subject_type VARCHAR(20) NOT NULL CHECK (subject_type IN ('TASK', 'CONTRACT', 'DEVICE')),
        subject_id INTEGER NOT NULL CHECK (subject_id > 0),
        status VARCHAR(20) NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'CANCELLED')),
        current_step_key VARCHAR(100),
        current_step_run_id INTEGER,
        started_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        completed_at TIMESTAMPTZ,
        cancelled_reason TEXT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_workflow_instances_version FOREIGN KEY (version_id, definition_id)
          REFERENCES workflow_versions(id, definition_id) ON DELETE RESTRICT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_instances_running ON workflow_instances(definition_id, subject_type, subject_id) WHERE status = 'RUNNING';
      CREATE INDEX IF NOT EXISTS idx_workflow_instances_filters ON workflow_instances(status, definition_id, current_step_key);
      CREATE INDEX IF NOT EXISTS idx_workflow_instances_subject ON workflow_instances(subject_type, subject_id);
      CREATE TABLE IF NOT EXISTS workflow_step_runs (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER NOT NULL REFERENCES workflow_instances(id) ON DELETE RESTRICT,
        step_id INTEGER NOT NULL REFERENCES workflow_steps(id) ON DELETE RESTRICT,
        step_key VARCHAR(100) NOT NULL,
        attempt INTEGER NOT NULL CHECK (attempt > 0),
        assignee_type VARCHAR(30) NOT NULL CHECK (assignee_type IN ('USER', 'SUBJECT_ASSIGNEE', 'ROLE', 'FUNCTION_GROUP', 'BRIGADE')),
        assigned_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
        assigned_group_type VARCHAR(30) CHECK (assigned_group_type IN ('ROLE', 'FUNCTION_GROUP', 'BRIGADE')),
        assigned_group_ref VARCHAR(100),
        form_instance_id INTEGER REFERENCES form_instances(id) ON DELETE RESTRICT,
        form_template_version_id INTEGER REFERENCES form_template_versions(id) ON DELETE RESTRICT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        due_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        completed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        outcome VARCHAR(20) CHECK (outcome IN ('COMPLETED', 'RETURNED', 'FORCED', 'CANCELLED')),
        note TEXT,
        CONSTRAINT uq_workflow_step_runs_attempt UNIQUE (instance_id, step_key, attempt),
        CONSTRAINT uq_workflow_step_runs_id_instance UNIQUE (id, instance_id),
        CONSTRAINT chk_workflow_step_runs_assignment CHECK (
          (assigned_user_id IS NOT NULL AND assigned_group_type IS NULL AND assigned_group_ref IS NULL)
          OR (assigned_user_id IS NULL AND assigned_group_type IS NOT NULL AND assigned_group_ref IS NOT NULL))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_step_runs_active ON workflow_step_runs(instance_id) WHERE outcome IS NULL;
      CREATE INDEX IF NOT EXISTS idx_workflow_step_runs_user ON workflow_step_runs(assigned_user_id) WHERE outcome IS NULL;
      CREATE INDEX IF NOT EXISTS idx_workflow_step_runs_group ON workflow_step_runs(assigned_group_type, assigned_group_ref) WHERE outcome IS NULL;
      CREATE INDEX IF NOT EXISTS idx_workflow_step_runs_form ON workflow_step_runs(form_instance_id);
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'workflow_instances'::regclass AND conname = 'fk_workflow_instances_current_run') THEN
          ALTER TABLE workflow_instances ADD CONSTRAINT fk_workflow_instances_current_run
            FOREIGN KEY (current_step_run_id, id) REFERENCES workflow_step_runs(id, instance_id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workflow_instances DROP CONSTRAINT fk_workflow_instances_current_run;
      DROP TABLE workflow_step_runs;
      DROP TABLE workflow_instances;
      ALTER TABLE workflow_versions DROP CONSTRAINT uq_workflow_versions_id_definition;
    `);
  }
}

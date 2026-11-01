import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAutomation1793640000000 implements MigrationInterface {
  name = 'CreateAutomation1793640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS automation_chains (
        id SERIAL PRIMARY KEY,
        owner_type VARCHAR(40) NOT NULL,
        owner_id INTEGER NOT NULL,
        event_type VARCHAR(60) NOT NULL,
        steps JSONB NOT NULL DEFAULT '[]'::jsonb,
        on_error VARCHAR(10) NOT NULL DEFAULT 'STOP',
        created_by INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_automation_chains_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT chk_automation_chains_on_error CHECK (on_error IN ('STOP', 'CONTINUE')),
        CONSTRAINT chk_automation_chains_steps_array CHECK (jsonb_typeof(steps) = 'array')
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_chains_owner_event
        ON automation_chains(owner_type, owner_id, event_type);

      CREATE TABLE IF NOT EXISTS automation_runs (
        id SERIAL PRIMARY KEY,
        chain_id INTEGER NOT NULL,
        event_id UUID,
        event JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        finished_at TIMESTAMPTZ,
        dry_run BOOLEAN NOT NULL DEFAULT FALSE,
        causation_depth INTEGER NOT NULL DEFAULT 0,
        chain_author_id INTEGER,
        actor_id INTEGER,
        message TEXT,
        CONSTRAINT fk_automation_runs_chain FOREIGN KEY (chain_id) REFERENCES automation_chains(id) ON DELETE CASCADE,
        CONSTRAINT chk_automation_runs_status CHECK (status IN ('RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL', 'BLOCKED'))
      );
      CREATE INDEX IF NOT EXISTS idx_automation_runs_chain ON automation_runs(chain_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_runs_chain_event
        ON automation_runs(chain_id, event_id) WHERE dry_run = FALSE AND event_id IS NOT NULL;

      CREATE TABLE IF NOT EXISTS automation_run_steps (
        id SERIAL PRIMARY KEY,
        run_id INTEGER NOT NULL,
        step_index INTEGER NOT NULL,
        action VARCHAR(100) NOT NULL,
        input JSONB NOT NULL DEFAULT '{}'::jsonb,
        output JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        attempt INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        message TEXT,
        started_at TIMESTAMPTZ,
        finished_at TIMESTAMPTZ,
        idempotency_key VARCHAR(100) NOT NULL,
        CONSTRAINT fk_automation_run_steps_run FOREIGN KEY (run_id) REFERENCES automation_runs(id) ON DELETE CASCADE,
        CONSTRAINT chk_automation_run_steps_status CHECK (status IN ('PENDING', 'RETRY', 'SUCCEEDED', 'SKIPPED', 'FAILED'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_run_steps_idempotency ON automation_run_steps(idempotency_key);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_run_steps_index ON automation_run_steps(run_id, step_index);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS automation_run_steps;
      DROP TABLE IF EXISTS automation_runs;
      DROP TABLE IF EXISTS automation_chains;
    `);
  }
}

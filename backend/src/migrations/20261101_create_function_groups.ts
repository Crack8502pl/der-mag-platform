import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFunctionGroups1793553600000 implements MigrationInterface {
  name = 'CreateFunctionGroups1793553600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS function_groups (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_function_groups_key UNIQUE (key),
        CONSTRAINT chk_function_groups_key CHECK (key ~ '^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$'),
        CONSTRAINT chk_function_groups_permissions_object CHECK (jsonb_typeof(permissions) = 'object'),
        CONSTRAINT chk_function_groups_no_all CHECK (NOT (permissions ? 'all'))
      );

      CREATE TABLE IF NOT EXISTS user_function_groups (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        function_group_id INTEGER NOT NULL,
        valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
        valid_to TIMESTAMPTZ,
        granted_by_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_user_function_groups_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_function_groups_group FOREIGN KEY (function_group_id) REFERENCES function_groups(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_function_groups_granted_by FOREIGN KEY (granted_by_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT uq_user_function_groups_period UNIQUE (user_id, function_group_id, valid_from),
        CONSTRAINT chk_user_function_groups_period CHECK (valid_to IS NULL OR valid_to >= valid_from)
      );
      CREATE INDEX IF NOT EXISTS idx_user_function_groups_user ON user_function_groups(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_function_groups_group ON user_function_groups(function_group_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS user_function_groups;
      DROP TABLE IF EXISTS function_groups;
    `);
  }
}

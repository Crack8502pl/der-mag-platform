import { MigrationInterface, QueryRunner } from 'typeorm';

export class FormTimestampsWithTimeZone1793491800000 implements MigrationInterface {
  name = 'FormTimestampsWithTimeZone1793491800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Historical database-generated values were UTC; submitted_at was written in Europe/Warsaw.
    await queryRunner.query(`
      ALTER TABLE form_instances
        ALTER COLUMN submitted_at TYPE TIMESTAMPTZ
          USING submitted_at AT TIME ZONE 'Europe/Warsaw',
        ALTER COLUMN created_at TYPE TIMESTAMPTZ
          USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at TYPE TIMESTAMPTZ
          USING updated_at AT TIME ZONE 'UTC';

      ALTER TABLE form_approvals
        ALTER COLUMN decided_at TYPE TIMESTAMPTZ
          USING decided_at AT TIME ZONE 'UTC';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE form_instances
        ALTER COLUMN submitted_at TYPE TIMESTAMP WITHOUT TIME ZONE
          USING submitted_at AT TIME ZONE 'Europe/Warsaw',
        ALTER COLUMN created_at TYPE TIMESTAMP WITHOUT TIME ZONE
          USING created_at AT TIME ZONE 'UTC',
        ALTER COLUMN updated_at TYPE TIMESTAMP WITHOUT TIME ZONE
          USING updated_at AT TIME ZONE 'UTC';

      ALTER TABLE form_approvals
        ALTER COLUMN decided_at TYPE TIMESTAMP WITHOUT TIME ZONE
          USING decided_at AT TIME ZONE 'UTC';
    `);
  }
}

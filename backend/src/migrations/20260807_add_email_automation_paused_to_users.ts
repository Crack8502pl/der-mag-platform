import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailAutomationPausedToUsers20260807 implements MigrationInterface {
  name = 'AddEmailAutomationPausedToUsers20260807';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_automation_paused BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS email_automation_pause_reason TEXT NULL,
      ADD COLUMN IF NOT EXISTS email_automation_paused_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS email_automation_paused_by INT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS email_automation_paused,
      DROP COLUMN IF EXISTS email_automation_pause_reason,
      DROP COLUMN IF EXISTS email_automation_paused_at,
      DROP COLUMN IF EXISTS email_automation_paused_by
    `);
  }
}

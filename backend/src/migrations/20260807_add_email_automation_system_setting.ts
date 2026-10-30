import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailAutomationSystemSetting1786060800000 implements MigrationInterface {
  name = 'AddEmailAutomationSystemSetting1786060800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO system_config (key, value, is_encrypted, category, updated_at)
      VALUES ('email_automation_enabled', 'true', false, 'email_automation', NOW())
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM system_config
      WHERE key = 'email_automation_enabled'
    `);
  }
}

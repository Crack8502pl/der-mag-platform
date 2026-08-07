import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailAutomationAuditTable20260807 implements MigrationInterface {
  name = 'AddEmailAutomationAuditTable20260807';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS email_automation_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_admin_id INT NULL,
        target_type VARCHAR(20) NOT NULL,
        target_id INT NULL,
        field VARCHAR(100) NOT NULL,
        old_value VARCHAR(255) NULL,
        new_value VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_email_automation_audit_target
      ON email_automation_audit_log(target_type, target_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS email_automation_audit_log');
  }
}

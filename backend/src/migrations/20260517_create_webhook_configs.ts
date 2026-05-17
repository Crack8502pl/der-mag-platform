import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhookConfigs20260517 implements MigrationInterface {
  name = 'CreateWebhookConfigs20260517';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS webhook_configs (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(20) NOT NULL,
        webhook_url VARCHAR(500) NOT NULL,
        event_type VARCHAR(50) NOT NULL DEFAULT 'all',
        channel_name VARCHAR(100),
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_webhook_configs_provider ON webhook_configs(provider);
      CREATE INDEX IF NOT EXISTS idx_webhook_configs_event_type ON webhook_configs(event_type);
      CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON webhook_configs(active);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS webhook_configs');
  }
}

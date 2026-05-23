import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGpsToServiceTask1779574500000 implements MigrationInterface {
  name = 'AddGpsToServiceTask1779574500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE service_tasks
        ADD COLUMN IF NOT EXISTS gps_latitude DECIMAL(10,7),
        ADD COLUMN IF NOT EXISTS gps_longitude DECIMAL(10,7),
        ADD COLUMN IF NOT EXISTS google_maps_url VARCHAR(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE service_tasks
        DROP COLUMN IF EXISTS gps_latitude,
        DROP COLUMN IF EXISTS gps_longitude,
        DROP COLUMN IF EXISTS google_maps_url
    `);
  }
}

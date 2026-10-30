import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const LEGACY_DATA_MIGRATIONS = [
  '20251230_add_system_config.sql',
  '20260102_full_permissions_sync.sql',
  '20260107_create_notification_schedules.sql',
  '20260108_add_brigades_permissions.sql',
  '20260207_add_bom_groups.sql',
  '20261001_seed_slican_centrals_and_licenses.sql',
];

export class MigrateLegacyData1793318400000 implements MigrationInterface {
  name = 'MigrateLegacyData1793318400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const migrationsDirectory = [
      path.resolve(process.cwd(), 'scripts/migrations'),
      path.resolve(process.cwd(), 'dist/scripts/migrations'),
    ].find(existsSync);

    if (!migrationsDirectory) {
      throw new Error('Legacy SQL migration files were not found in scripts/migrations.');
    }

    for (const filename of LEGACY_DATA_MIGRATIONS) {
      const migrationPath = path.join(migrationsDirectory, filename);
      const sql = readFileSync(migrationPath, 'utf8')
        .replace(/^\s*\\echo\b.*$/gm, '')
        .replace(/^\s*(BEGIN|COMMIT);\s*$/gim, '');

      console.log(`Uruchamianie migracji danych TypeORM: ${filename}`);
      await queryRunner.query(sql);
    }
  }

  public async down(): Promise<void> {
    throw new Error('Legacy data and permission migrations cannot be safely rolled back.');
  }
}

import { readFileSync } from 'fs';
import * as path from 'path';
import { AppDataSource } from '../src/config/database';

const DATA_MIGRATIONS = [
  '20251230_add_system_config.sql',
  '20260102_full_permissions_sync.sql',
  '20260107_create_notification_schedules.sql',
  '20260108_add_brigades_permissions.sql',
  '20260207_add_bom_groups.sql',
  '20261001_seed_slican_centrals_and_licenses.sql',
];

export async function runDataMigrations(): Promise<void> {
  for (const filename of DATA_MIGRATIONS) {
    const migrationPath = path.join(__dirname, 'migrations', filename);
    const sql = readFileSync(migrationPath, 'utf8').replace(/^\s*\\echo\b.*$/gm, '');
    console.log(`Uruchamianie migracji danych: ${filename}`);
    await AppDataSource.query(sql);
  }
}

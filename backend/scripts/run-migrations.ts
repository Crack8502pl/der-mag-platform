import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';

async function runMigrations(): Promise<void> {
  try {
    await AppDataSource.initialize();
    const migrations = await AppDataSource.runMigrations();
    console.log(`Migracje TypeORM zakończone. Zastosowano: ${migrations.length}.`);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

runMigrations().catch(error => {
  console.error('Nie udało się uruchomić migracji TypeORM:', error);
  process.exitCode = 1;
});

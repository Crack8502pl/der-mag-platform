import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { AppDataSource } from '../config/database';
import { DatabaseSeeder } from '../services/DatabaseSeeder';
import { ShipmentBomTemplatesSeed } from '../seeds/shipmentBomTemplates.seed';

dotenv.config();

async function migrateAndSeed(): Promise<void> {
  try {
    await AppDataSource.initialize();
    const migrations = await AppDataSource.runMigrations();
    console.log(`Zastosowano migracji: ${migrations.length}.`);
    await DatabaseSeeder.seed();
    await ShipmentBomTemplatesSeed.seed();
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

migrateAndSeed().catch((error: unknown) => {
  console.error('Migracje lub seedowanie bazy nie powiodły się:', error);
  process.exitCode = 1;
});

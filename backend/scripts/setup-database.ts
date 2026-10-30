import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';
import { DatabaseSeeder } from '../src/services/DatabaseSeeder';
import { runDataMigrations } from './run-data-migrations';
import * as dotenv from 'dotenv';

dotenv.config();

async function setupDatabase() {
  console.log('🚀 Rozpoczynam konfigurację bazy danych...\n');
  
  try {
    console.log('📦 Krok 1: Migracje TypeORM...');
    await AppDataSource.initialize();
    const migrations = await AppDataSource.runMigrations();
    console.log(`✅ Połączono z bazą. Zastosowano migracji: ${migrations.length}.\n`);
    
    console.log('📦 Krok 2: Migracje danych i uprawnień...');
    await runDataMigrations();
    console.log('✅ Migracje danych i uprawnień zakończone.\n');

    console.log('📦 Krok 3: Brakujące dane początkowe...');
    await DatabaseSeeder.seed();
    console.log('✅ Dane początkowe gotowe.\n');
    
    console.log('════════════════════════════════════════');
    console.log('🎉 Database setup completed successfully!');
    console.log('════════════════════════════════════════');
    console.log('');
    console.log('📋 Default admin credentials:');
    console.log('   Username: admin');
    console.log('   Password: Admin123!');
    console.log(`   Email: ${process.env.ADMIN_EMAIL || 'r.krakowski@der-mag.pl'}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Konfiguracja bazy danych nie powiodła się:', error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

setupDatabase();

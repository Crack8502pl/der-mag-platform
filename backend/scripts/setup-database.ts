// scripts/setup-database.ts
// Complete database setup: migrations + seed
import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';
import { DatabaseSeeder } from '../src/services/DatabaseSeeder';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function setupDatabase() {
  console.log('🚀 Starting complete database setup...\n');
  
  try {
    // Step 1: Run SQL migrations
    console.log('📦 Step 1: Running SQL migrations...');
    try {
      const scriptPath = path.join(__dirname, 'run-all-migrations.sh');
      execSync(`bash ${scriptPath}`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ SQL migrations completed\n');
    } catch (error) {
      console.log('⚠️  Migrations may already be applied (continuing...)\n');
    }
    
    // Step 2: Initialize TypeORM connection
    console.log('📦 Step 2: Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');
    
    // Step 3: Run seeders
    console.log('📦 Step 3: Running database seeders...');
    await DatabaseSeeder.seed();
    console.log('✅ Seeders completed\n');
    
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
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

setupDatabase();

// src/services/DatabaseSeeder.ts
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { Role } from '../entities/Role';
import { User } from '../entities/User';
import { TaskType } from '../entities/TaskType';

export class DatabaseSeeder {
  
  static async seed(): Promise<void> {
    console.log('🌱 Sprawdzanie czy baza wymaga seedowania...');
    
    const roleRepo = AppDataSource.getRepository(Role);
    const roleCount = await roleRepo.count();
    
    if (roleCount > 0) {
      console.log('✅ Baza danych już zawiera dane - pomijam seedowanie');
      return;
    }
    
    console.log('📦 Seedowanie bazy danych...');
    
    await this.seedRoles();
    await this.seedTaskTypes();
    await this.seedAdmin();
    
    console.log('✅ Seedowanie zakończone pomyślnie!');
    console.log('');
    console.log('📋 Domyślne dane logowania:');
    console.log('   Username: admin');
    console.log('   Password: Admin123!');
    console.log(`   Email: ${process.env.ADMIN_EMAIL || 'r.krakowski@der-mag.pl'}`);
    console.log('');
  }
  
  private static async seedRoles(): Promise<void> {
    const roleRepo = AppDataSource.getRepository(Role);
    
    const roles = [
      {
        name: 'admin',
        description: 'Administrator Systemu - Pełny dostęp',
        permissions: { all: true }
      },
      {
        name: 'management_board',
        description: 'Zarząd - Zarządzanie Menadżerami, przydzielanie projektów, raporty dobowe',
        permissions: {
          dashboard: { read: true },
          contracts: { read: true, create: true, update: true, approve: true, import: true },
          subsystems: { read: true, create: true, update: true, generateBom: true, allocateNetwork: true },
          tasks: { read: true, create: true, update: true, assign: true },
          completion: { read: true, decideContinue: true },
          prefabrication: { read: true },
          network: { read: true, createPool: true, updatePool: true, allocate: true, viewMatrix: true },
          bom: { read: true, create: true, update: true },
          devices: { read: true, create: true, update: true },
          users: { read: true, create: true, update: true },
          reports: { read: true, create: true, export: true },
          settings: { read: true, update: true },
          photos: { read: true, approve: true },
          documents: { read: true, create: true, delete: true },
          notifications: { receiveAlerts: true, sendManual: true }
        }
      },
      {
        name: 'manager',
        description: 'Menedżer - Zarządzanie projektami, użytkownikami i raportami',
        permissions: {
          dashboard: { read: true },
          contracts: { read: true, create: true, update: true, approve: true, import: true },
          subsystems: { read: true, create: true, update: true, generateBom: true, allocateNetwork: true },
          tasks: { read: true, create: true, update: true, assign: true },
          completion: { read: true, decideContinue: true },
          prefabrication: { read: true },
          network: { read: true, createPool: true, updatePool: true, allocate: true, viewMatrix: true },
          bom: { read: true, create: true, update: true },
          devices: { read: true, create: true, update: true },
          users: { read: true },
          reports: { read: true, create: true, export: true },
          settings: { read: true, update: true },
          photos: { read: true, approve: true },
          documents: { read: true, create: true, delete: true },
          notifications: { receiveAlerts: true, sendManual: true }
        }
      },
      {
        name: 'coordinator',
        description: 'Koordynator - Koordynacja zadań serwisowych, przypisywanie pracowników',
        permissions: {
          dashboard: { read: true },
          contracts: { read: true },
          subsystems: { read: true },
          tasks: { read: true, create: 'SERWIS', update: true, assign: true },
          completion: { read: true },
          prefabrication: { read: true },
          network: { read: true, viewMatrix: true },
          bom: { read: true },
          devices: { read: true },
          users: { read: true },
          reports: { read: true, export: true },
          settings: { read: true, update: true },
          photos: { read: true },
          documents: { read: true, create: true },
          notifications: { receiveAlerts: true },
          cars: { read: true, update: true }
        }
      },
      {
        name: 'bom_editor',
        description: 'Edytor BOM-ów - Zarządzanie materiałami i szablonami BOM',
        permissions: {
          dashboard: { read: true },
          subsystems: { read: true, generateBom: true, allocateNetwork: true },
          tasks: { read: true },
          network: { read: true, allocate: true, viewMatrix: true },
          bom: { read: true, create: true, update: true, delete: true },
          devices: { read: true },
          reports: { read: true },
          settings: { read: true, update: true },
          documents: { read: true },
          notifications: { receiveAlerts: true, configureTriggers: true }
        }
      },
      {
        name: 'prefabricator',
        description: 'Prefabrykant - Prefabrykacja urządzeń, weryfikacja numerów seryjnych',
        permissions: {
          dashboard: { read: true },
          tasks: { read: true },
          completion: { scan: true },
          prefabrication: { 
            read: true, receiveOrder: true, configure: true, 
            verify: true, assignSerial: true, complete: true 
          },
          network: { read: true, viewMatrix: true },
          bom: { read: true },
          devices: { read: true, create: true, update: true, verify: true },
          settings: { read: true, update: true },
          documents: { read: true },
          notifications: { receiveAlerts: true }
        }
      },
      {
        name: 'worker',
        description: 'Pracownik - Realizacja zadań, kompletacja, upload zdjęć',
        permissions: {
          dashboard: { read: true },
          tasks: { read: true, update: 'OWN' },
          completion: { 
            read: true, scan: true, assignPallet: true, 
            reportMissing: true, complete: true 
          },
          network: { viewMatrix: true },
          bom: { read: true },
          devices: { read: true, update: true },
          settings: { read: true, update: true },
          photos: { read: true, create: true },
          documents: { read: true },
          notifications: { receiveAlerts: true }
        }
      },
      {
        name: 'order_picking',
        description: 'Pracownik przygotowania - Kompletacja podzespołów, dodawanie numerów seryjnych',
        permissions: {
          dashboard: { read: true },
          tasks: { read: true },
          completion: { 
            read: true, scan: true, assignPallet: true, 
            reportMissing: true, complete: true 
          },
          bom: { read: true },
          devices: { read: true, verify: true },
          reports: { read: true },
          settings: { read: true, update: true },
          photos: { read: true, create: true },
          documents: { read: true },
          notifications: { receiveAlerts: true, sendManual: true }
        }
      },
      {
        name: 'integrator',
        description: 'System - Integruje z platformami zewnętrznymi',
        permissions: {
          contracts: { read: true, create: true, update: true, import: true },
          bom: { read: true, update: true },
          devices: { read: true, create: true, update: true, verify: true }
        }
      },
      {
        name: 'viewer',
        description: 'Podgląd - tylko odczyt wszystkich modułów',
        permissions: {
          dashboard: { read: true },
          contracts: { read: true },
          subsystems: { read: true },
          tasks: { read: true },
          completion: { read: true },
          prefabrication: { read: true },
          network: { read: true, viewMatrix: true },
          bom: { read: true },
          devices: { read: true },
          users: { read: true },
          reports: { read: true },
          settings: { read: true },
          photos: { read: true },
          documents: { read: true },
          notifications: { receiveAlerts: true }
        }
      }
    ];
    
    for (const role of roles) {
      const newRole = roleRepo.create(role);
      await roleRepo.save(newRole);
    }
    
    console.log('   ✅ Role utworzone (10 ról)');
  }
  
  private static async seedTaskTypes(): Promise<void> {
    const taskTypeRepo = AppDataSource.getRepository(TaskType);
    
    // ZAKTUALIZOWANE KODY - zgodne z migracją 20260106_update_task_types.sql
    const taskTypes = [
      { name: 'System Monitoringu Wizyjnego', code: 'SMW', description: 'System Monitoringu Wizyjnego', active: true, configuration: { has_bom: true, has_ip_config: true } },
      { name: 'SDIP', code: 'SDIP', description: 'Cyfrowe Systemy Dźwiękowego Informowania Pasażerów', active: true, configuration: { has_bom: true, has_ip_config: true } },
      { name: 'LAN', code: 'LAN', description: 'Sieci LAN', active: true, configuration: { has_bom: true, has_ip_config: true } },
      { name: 'SMOK-IP/CMOK-IP (Wariant A/SKP)', code: 'SMOKIP_A', description: 'Wariant A', active: true, configuration: { has_bom: true, has_ip_config: true } },
      { name: 'SMOK-IP/CMOK-IP (Wariant B)', code: 'SMOKIP_B', description: 'Wariant B', active: true, configuration: { has_bom: true, has_ip_config: true } },
      { name: 'SSWiN', code: 'SSWIN', description: 'System Sygnalizacji Włamania i Napadu', active: true, configuration: { has_bom: true, has_ip_config: false } },
      { name: 'SSP', code: 'SSP', description: 'System Sygnalizacji Pożaru', active: true, configuration: { has_bom: true, has_ip_config: false } },
      { name: 'SUG', code: 'SUG', description: 'Stałe Urządzenie Gaśnicze', active: true, configuration: { has_bom: true, has_ip_config: false } },
      { name: 'Zasilanie', code: 'ZASILANIE', description: 'Systemy zasilania', active: true, configuration: { has_bom: true, has_ip_config: false } },
      { name: 'Struktury Światłowodowe', code: 'OTK', description: 'Infrastruktura światłowodowa', active: true, configuration: { has_bom: true, has_ip_config: false } },
      { name: 'SKD', code: 'SKD', description: 'System Kontroli Dostępu', active: true, configuration: { has_bom: true, has_ip_config: true } },
      { name: 'CCTV', code: 'CCTV', description: 'System Telewizji Przemysłowej', active: true, configuration: { has_bom: true, has_ip_config: true } },
      { name: 'Zadanie Serwisowe', code: 'SERWIS', description: 'Naprawa, konserwacja i interwencje serwisowe', active: true, configuration: { has_bom: true, has_ip_config: false } }
    ];
    
    for (const taskType of taskTypes) {
      const newTaskType = taskTypeRepo.create(taskType);
      await taskTypeRepo.save(newTaskType);
    }
    
    console.log('   ✅ Typy zadań utworzone (13)');
  }
  
  private static async seedAdmin(): Promise<void> {
    const userRepo = AppDataSource.getRepository(User);
    const roleRepo = AppDataSource.getRepository(Role);
    
    const adminRole = await roleRepo.findOne({ where: { name: 'admin' } });
    
    if (!adminRole) {
      throw new Error('Rola admin nie została utworzona');
    }
    
    const adminEmail = process.env.ADMIN_EMAIL || 'r.krakowski@der-mag.pl';
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const admin = userRepo.create({
      username: 'admin',
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Administrator',
      lastName: 'Systemu',
      phone: '+48123456789',
      role: adminRole,
      active: true
    });
    
    await userRepo.save(admin);
    
    console.log('   ✅ Użytkownik admin utworzony');
  }

  /**
   * Wymuszone seedowanie - UWAGA: usuwa istniejące dane!
   */
  static async forceSeed(): Promise<void> {
    console.log('⚠️  WYMUSZONE SEEDOWANIE - Usuwanie istniejących danych...');
    
    // Wyłącz foreign key checks tymczasowo
    await AppDataSource.query('SET session_replication_role = replica;');
    
    try {
      // Usuń dane z tabel zależnych (od najniższego poziomu)
      await AppDataSource.query('TRUNCATE TABLE service_task_activities CASCADE');
      await AppDataSource.query('TRUNCATE TABLE service_tasks CASCADE');
      await AppDataSource.query('TRUNCATE TABLE brigade_members CASCADE');
      await AppDataSource.query('TRUNCATE TABLE brigades CASCADE');
      await AppDataSource.query('TRUNCATE TABLE subsystem_tasks CASCADE');
      await AppDataSource.query('TRUNCATE TABLE bom_trigger_logs CASCADE');
      await AppDataSource.query('TRUNCATE TABLE bom_triggers CASCADE');
      await AppDataSource.query('TRUNCATE TABLE refresh_tokens CASCADE');
      await AppDataSource.query('TRUNCATE TABLE audit_logs CASCADE');
      
      // Usuń główne dane seedowe - UŻYJ clear() zamiast delete({})
      const userRepo = AppDataSource.getRepository(User);
      const roleRepo = AppDataSource.getRepository(Role);
      const taskTypeRepo = AppDataSource.getRepository(TaskType);
      
      await userRepo.clear();
      await roleRepo.clear();
      await taskTypeRepo.clear();
      
      console.log('🗑️  Dane usunięte');
      console.log('📦 Rozpoczynam seedowanie...');
      
      await this.seedRoles();
      await this.seedTaskTypes();
      await this.seedAdmin();
      
      console.log('✅ Wymuszone seedowanie zakończone pomyślnie!');
    } finally {
      // Włącz z powrotem foreign key checks
      await AppDataSource.query('SET session_replication_role = DEFAULT;');
    }
  }
}

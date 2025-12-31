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
      { name: 'admin', description: 'Administrator systemu z pełnymi uprawnieniami', permissions: { all: true } },
      { name: 'manager', description: 'Menedżer projektów', permissions: { tasks: true, users: true } },
      { name: 'coordinator', description: 'Koordynator zadań serwisowych', permissions: { tasks: { read: true, update: true, create: ['SERWIS'], assign: true }, users: { read: true } } },
      { name: 'technician', description: 'Technik terenowy', permissions: { tasks: true } },
      { name: 'viewer', description: 'Podgląd systemu', permissions: { read: true } }
    ];
    
    for (const role of roles) {
      const newRole = roleRepo.create(role);
      await roleRepo.save(newRole);
    }
    
    console.log('   ✅ Role utworzone');
  }
  
  private static async seedTaskTypes(): Promise<void> {
    const taskTypeRepo = AppDataSource.getRepository(TaskType);
    
    const taskTypes = [
      { name: 'System Monitoringu Wizyjnego', code: 'SMW', description: 'System Monitoringu Wizyjnego', active: true, configuration: { has_bom: true, has_ip_config: true } },
      { name: 'CSDIP', code: 'CSDIP', description: 'Cyfrowe Systemy Dźwiękowego Informowania Pasażerów', active: true, configuration: { has_bom: true, has_ip_config: true } },
      { name: 'LAN PKP PLK', code: 'LAN_PKP_PLK', description: 'Sieci LAN PKP PLK', active: true, configuration: { has_bom: true, has_ip_config: true } },
      { name: 'SMOK-IP/CMOK-IP (Wariant A/SKP)', code: 'SMOK_IP_A', description: 'Wariant A', active: true, configuration: { has_bom: true, has_ip_config: true } },
      { name: 'SMOK-IP/CMOK-IP (Wariant B)', code: 'SMOK_IP_B', description: 'Wariant B', active: true, configuration: { has_bom: true, has_ip_config: true } },
      { name: 'SSWiN', code: 'SSWIN', description: 'System Sygnalizacji Włamania i Napadu', active: true, configuration: { has_bom: true, has_ip_config: false } },
      { name: 'SSP', code: 'SSP', description: 'System Sygnalizacji Pożaru', active: true, configuration: { has_bom: true, has_ip_config: false } },
      { name: 'SUG', code: 'SUG', description: 'Stałe Urządzenie Gaśnicze', active: true, configuration: { has_bom: true, has_ip_config: false } },
      { name: 'Obiekty Kubaturowe', code: 'OBIEKTY_KUBATUROWE', description: 'Obiekty budowlane', active: true, configuration: { has_bom: true, has_ip_config: false } },
      { name: 'Kontrakty Liniowe', code: 'KONTRAKTY_LINIOWE', description: 'Kontrakty liniowe kolejowe', active: true, configuration: { has_bom: true, has_ip_config: false } },
      { name: 'LAN Strukturalny Miedziana', code: 'LAN_STRUKTURALNY', description: 'Okablowanie miedziane', active: true, configuration: { has_bom: true, has_ip_config: true } },
      { name: 'Zasilania', code: 'ZASILANIA', description: 'Systemy zasilania', active: true, configuration: { has_bom: true, has_ip_config: false } },
      { name: 'Struktury Światłowodowe', code: 'STRUKTURY_SWIATLO', description: 'Infrastruktura światłowodowa', active: true, configuration: { has_bom: true, has_ip_config: false } },
      { name: 'Zadanie Serwisowe', code: 'SERWIS', description: 'Naprawa, konserwacja i interwencje serwisowe', active: true, configuration: { has_bom: true, has_ip_config: false } }
    ];
    
    for (const taskType of taskTypes) {
      const newTaskType = taskTypeRepo.create(taskType);
      await taskTypeRepo.save(newTaskType);
    }
    
    console.log('   ✅ Typy zadań utworzone (14)');
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
}

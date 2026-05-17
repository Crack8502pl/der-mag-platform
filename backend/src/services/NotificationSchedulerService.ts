// src/services/NotificationSchedulerService.ts
// Service for scheduling and managing email notifications

import cron, { ScheduledTask } from 'node-cron';
import { AppDataSource } from '../config/database';
import { NotificationSchedule } from '../entities/NotificationSchedule';
import { User } from '../entities/User';
import { Brigade } from '../entities/Brigade';
import { Contract, ContractStatus } from '../entities/Contract';
import { WarehouseStock } from '../entities/WarehouseStock';
import { Task } from '../entities/Task';
import { ServiceTask } from '../entities/ServiceTask';
import EmailQueueService from './EmailQueueService';
import ContractNotificationService from './ContractNotificationService';
import StockNotificationService from './StockNotificationService';
import SlackWebhookService from './SlackWebhookService';
import { BrigadeService } from './BrigadeService';
import { ContractService } from './ContractService';
import { WarehouseStockService } from './WarehouseStockService';
import { EmailTemplate } from '../types/EmailTypes';
import { emailConfig } from '../config/email';

export class NotificationSchedulerService {
  private scheduleRepository = AppDataSource.getRepository(NotificationSchedule);
  private userRepository = AppDataSource.getRepository(User);
  private brigadeRepository = AppDataSource.getRepository(Brigade);
  private contractRepository = AppDataSource.getRepository(Contract);
  private stockRepository = AppDataSource.getRepository(WarehouseStock);
  private taskRepository = AppDataSource.getRepository(Task);
  private serviceTaskRepository = AppDataSource.getRepository(ServiceTask);
  private jobs: Map<string, ScheduledTask> = new Map();
  private initialized = false;

  /**
   * Inicjalizacja harmonogramu
   */
  initialize(): void {
    if (this.initialized) {
      console.log('⚠️  NotificationSchedulerService już zainicjalizowany');
      return;
    }

    try {
      // Dzienny raport brygad - 6:00
      this.scheduleJob('daily-brigades', '0 6 * * *', () => this.sendDailyBrigadeReport());
      
      // Dzienny raport zarządu - 8:00
      this.scheduleJob('daily-management', '0 8 * * *', () => this.sendDailyManagementReport());
      
      // Tygodniowy raport managerów - Poniedziałek 8:00
      this.scheduleJob('weekly-managers', '0 8 * * 1', () => this.sendWeeklyManagerReport());
      
      // Miesięczny raport KPI - 1. dzień miesiąca 9:00
      this.scheduleJob('monthly-kpi', '0 9 1 * *', () => this.sendMonthlyKPIReport());
      
      // Sprawdzanie deadline'ów kontraktów - Codziennie 7:00
      this.scheduleJob('contract-deadlines', '0 7 * * *', () => this.checkContractDeadlines());
      
      // Sprawdzanie stanów magazynowych - Codziennie 7:30
      this.scheduleJob('stock-alerts', '30 7 * * *', () => this.checkStockLevels());

      // Dzienny digest alertów magazynowych (jeśli tryb batch)
      if (emailConfig.alerts.mode === 'batch') {
        const [hour, minute] = emailConfig.alerts.batchTime.split(':');
        const cronExpr = `${minute} ${hour} * * *`;
        this.scheduleJob('stock-alerts-digest', cronExpr, () => this.sendDailyStockAlertsDigest());
        console.log(`📅 Dzienny digest alertów magazynowych: ${emailConfig.alerts.batchTime}`);
      }

      this.initialized = true;
      console.log('✅ NotificationSchedulerService zainicjalizowany - zadania cykliczne uruchomione');
    } catch (error) {
      console.error('❌ Błąd inicjalizacji NotificationSchedulerService:', error);
    }
  }

  /**
   * Rejestracja zadania cron
   */
  private scheduleJob(name: string, cronExpression: string, handler: () => Promise<void>): void {
    if (this.jobs.has(name)) {
      console.warn(`⚠️  Zadanie ${name} już istnieje`);
      return;
    }

    const job = cron.schedule(cronExpression, async () => {
      console.log(`📅 Wykonywanie zadania: ${name}`);
      try {
        await handler();
      } catch (error) {
        console.error(`❌ Błąd wykonywania zadania ${name}:`, error);
      }
    });

    this.jobs.set(name, job);
    console.log(`✅ Zarejestrowano zadanie: ${name} (${cronExpression})`);
  }

  /**
   * Pobiera emaile użytkowników według roli
   */
  private async getEmailsByRole(roleName: string): Promise<string[]> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.name = :roleName', { roleName })
      .andWhere('user.active = :active', { active: true })
      .getMany();

    return users.map(u => u.email);
  }

  /**
   * Pobiera emaile użytkowników według wielu ról
   */
  private async getEmailsByRoles(roleNames: string[]): Promise<string[]> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.name IN (:...roleNames)', { roleNames })
      .andWhere('user.active = :active', { active: true })
      .getMany();

    return users.map(u => u.email);
  }

  /**
   * Dzienny raport brygad
   */
  async sendDailyBrigadeReport(): Promise<void> {
    try {
      console.log('📊 Generowanie dziennego raportu brygad...');
      
      const brigadeService = new BrigadeService();
      const { brigades } = await brigadeService.getBrigades({ active: true });

      const reportData = await Promise.all(
        brigades.map(async (brigade) => {
          const activeMemberCount = brigade.members?.filter(m => m.active).length || 0;
          
          // Pobierz zadania serwisowe brygady
          const tasks = await this.serviceTaskRepository
            .createQueryBuilder('task')
            .where('task.brigadeId = :brigadeId', { brigadeId: brigade.id })
            .andWhere('task.status NOT IN (:...statuses)', { 
              statuses: ['completed', 'cancelled'] 
            })
            .getCount();

          return {
            brigadeName: brigade.name,
            brigadeCode: brigade.code,
            activeMembers: activeMemberCount,
            activeTasks: tasks,
          };
        })
      );

      // Pobierz emaile koordynatorów, managerów i adminów
    // Koordynatorzy to główni odbiorcy raportów brygad
    const coordinators = await this.getEmailsByRoles(['coordinator', 'manager', 'admin']);

      if (coordinators.length === 0) {
        console.warn('⚠️  Brak odbiorców dla dziennego raportu brygad');
        return;
      }

      for (const email of coordinators) {
        await EmailQueueService.addToQueue({
          to: email,
          subject: `📊 Dzienny raport brygad - ${new Date().toLocaleDateString('pl-PL')}`,
          template: EmailTemplate.REPORT_DAILY_BRIGADES,
          context: {
            date: new Date().toLocaleDateString('pl-PL'),
            brigades: reportData,
            totalBrigades: brigades.length,
            totalTasks: reportData.reduce((sum, b) => sum + b.activeTasks, 0),
            dashboardUrl: `${process.env.FRONTEND_URL}/brigades`,
          }
        });
      }

      console.log('✅ Dzienny raport brygad wysłany');
    } catch (error) {
      console.error('❌ Błąd wysyłania dziennego raportu brygad:', error);
    }
  }

  /**
   * Dzienny raport zarządu
   */
  async sendDailyManagementReport(): Promise<void> {
    try {
      console.log('📈 Generowanie dziennego raportu zarządu...');

      const contractStats = await this.getContractStats();
      const taskStats = await this.getTaskStats();
      const brigadeStats = await this.getBrigadeStats();
      const stockStats = await this.getStockStats();

      const managementBoard = await this.getEmailsByRoles(['management_board', 'admin']);

      if (managementBoard.length === 0) {
        console.warn('⚠️  Brak odbiorców dla dziennego raportu zarządu');
        return;
      }

      for (const email of managementBoard) {
        await EmailQueueService.addToQueue({
          to: email,
          subject: `📈 Raport dzienny - ${new Date().toLocaleDateString('pl-PL')}`,
          template: EmailTemplate.REPORT_DAILY_MANAGEMENT,
          context: {
            date: new Date().toLocaleDateString('pl-PL'),
            contracts: contractStats,
            tasks: taskStats,
            brigades: brigadeStats,
            stock: stockStats,
            dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
          }
        });
      }

      console.log('✅ Dzienny raport zarządu wysłany');
    } catch (error) {
      console.error('❌ Błąd wysyłania dziennego raportu zarządu:', error);
    }
  }

  /**
   * Tygodniowy raport managerów
   */
  async sendWeeklyManagerReport(): Promise<void> {
    try {
      console.log('📅 Generowanie tygodniowego raportu managerów...');

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const contractStats = await this.getContractStats();
      const taskStats = await this.getTaskStats();
      const weeklyProgress = await this.getWeeklyProgress(oneWeekAgo);

      const managers = await this.getEmailsByRoles(['manager', 'admin']);

      if (managers.length === 0) {
        console.warn('⚠️  Brak odbiorców dla tygodniowego raportu managerów');
        return;
      }

      for (const email of managers) {
        await EmailQueueService.addToQueue({
          to: email,
          subject: `📅 Raport tygodniowy - ${new Date().toLocaleDateString('pl-PL')}`,
          template: EmailTemplate.REPORT_WEEKLY_MANAGERS,
          context: {
            weekStart: oneWeekAgo.toLocaleDateString('pl-PL'),
            weekEnd: new Date().toLocaleDateString('pl-PL'),
            contracts: contractStats,
            tasks: taskStats,
            weeklyProgress,
            dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
          }
        });
      }

      console.log('✅ Tygodniowy raport managerów wysłany');
    } catch (error) {
      console.error('❌ Błąd wysyłania tygodniowego raportu managerów:', error);
    }
  }

  /**
   * Miesięczny raport KPI
   */
  async sendMonthlyKPIReport(): Promise<void> {
    try {
      console.log('📊 Generowanie miesięcznego raportu KPI...');

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const contractStats = await this.getContractStats();
      const taskStats = await this.getTaskStats();
      const monthlyMetrics = await this.getMonthlyMetrics(lastMonth);

      const recipients = await this.getEmailsByRoles(['management_board', 'admin']);

      if (recipients.length === 0) {
        console.warn('⚠️  Brak odbiorców dla miesięcznego raportu KPI');
        return;
      }

      for (const email of recipients) {
        await EmailQueueService.addToQueue({
          to: email,
          subject: `📊 Raport KPI - ${lastMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}`,
          template: EmailTemplate.REPORT_MONTHLY_KPI,
          context: {
            month: lastMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }),
            contracts: contractStats,
            tasks: taskStats,
            metrics: monthlyMetrics,
            dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
          }
        });
      }

      console.log('✅ Miesięczny raport KPI wysłany');
    } catch (error) {
      console.error('❌ Błąd wysyłania miesięcznego raportu KPI:', error);
    }
  }

  /**
   * Sprawdzanie deadline'ów kontraktów
   */
  async checkContractDeadlines(): Promise<void> {
    try {
      console.log('🔍 Sprawdzanie deadline\'ów kontraktów...');

      const contractService = new ContractService();
      
      // Pobierz kontrakty, które mają orderDate (używamy jako przykładowego deadline)
      const contracts = await this.contractRepository.find({
        where: { status: ContractStatus.IN_PROGRESS },
        relations: ['projectManager']
      });

      for (const contract of contracts) {
        if (!contract.orderDate) continue;

        const deadline = new Date(contract.orderDate);
        deadline.setDate(deadline.getDate() + 90); // Zakładamy 90 dni od orderDate

        const today = new Date();
        const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Powiadomienia przy 7, 3 i 1 dniu przed deadline
        if ([7, 3, 1].includes(daysRemaining)) {
          await ContractNotificationService.notifyContractDeadline(contract.id, daysRemaining);
        }
      }

      console.log('✅ Sprawdzanie deadline\'ów zakończone');
    } catch (error) {
      console.error('❌ Błąd sprawdzania deadline\'ów kontraktów:', error);
    }
  }

  /**
   * Sprawdzanie stanów magazynowych
   */
  async checkStockLevels(): Promise<void> {
    try {
      console.log('🔍 Sprawdzanie stanów magazynowych...');

      const lowStockItems = await this.stockRepository
        .createQueryBuilder('stock')
        .where('stock.quantityInStock < stock.minStockLevel')  // Zmiana z <= na <
        .andWhere('stock.minStockLevel IS NOT NULL')  // Dodanie warunku
        .andWhere('stock.quantityInStock >= 0')
        .getMany();

      for (const item of lowStockItems) {
        if (item.quantityInStock === 0) {
          await StockNotificationService.notifyCriticalStock(item.id);
        } else {
          await StockNotificationService.notifyLowStock(item.id);
        }
      }

      console.log(`✅ Sprawdzanie stanów magazynowych zakończone (${lowStockItems.length} alertów)`);
    } catch (error) {
      console.error('❌ Błąd sprawdzania stanów magazynowych:', error);
    }
  }

  /**
   * Pobiera statystyki kontraktów
   */
  private async getContractStats() {
    const total = await this.contractRepository.count();
    const active = await this.contractRepository.count({ 
      where: { status: ContractStatus.IN_PROGRESS } 
    });
    const completed = await this.contractRepository.count({ 
      where: { status: ContractStatus.COMPLETED } 
    });

    return { total, active, completed };
  }

  /**
   * Pobiera statystyki zadań
   */
  private async getTaskStats() {
    const total = await this.taskRepository.count();
    const active = await this.taskRepository.count({
      where: { status: 'in_progress' }
    });
    const completed = await this.taskRepository.count({
      where: { status: 'completed' }
    });
    const overdue = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.dueDate < :now', { now: new Date() })
      .andWhere('task.status NOT IN (:...statuses)', { 
        statuses: ['completed', 'cancelled'] 
      })
      .getCount();

    return { total, active, completed, overdue };
  }

  /**
   * Pobiera statystyki brygad
   */
  private async getBrigadeStats() {
    const total = await this.brigadeRepository.count();
    const active = await this.brigadeRepository.count({ where: { active: true } });

    return { total, active };
  }

  /**
   * Pobiera statystyki magazynu
   */
  private async getStockStats() {
    const total = await this.stockRepository.count();
    const lowStock = await this.stockRepository
      .createQueryBuilder('stock')
      .where('stock.quantityInStock <= stock.minStockLevel')
      .andWhere('stock.quantityInStock > 0')
      .getCount();
    const outOfStock = await this.stockRepository.count({ 
      where: { quantityInStock: 0 } 
    });

    return { total, lowStock, outOfStock };
  }

  /**
   * Pobiera postęp tygodniowy
   */
  private async getWeeklyProgress(weekStart: Date) {
    const tasksCompleted = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.completedAt >= :weekStart', { weekStart })
      .andWhere('task.status = :status', { status: 'completed' })
      .getCount();

    const tasksCreated = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.createdAt >= :weekStart', { weekStart })
      .getCount();

    return { tasksCompleted, tasksCreated };
  }

  /**
   * Pobiera metryki miesięczne
   */
  private async getMonthlyMetrics(monthStart: Date) {
    const contractsCreated = await this.contractRepository
      .createQueryBuilder('contract')
      .where('contract.createdAt >= :monthStart', { monthStart })
      .getCount();

    const tasksCompleted = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.completedAt >= :monthStart', { monthStart })
      .andWhere('task.status = :status', { status: 'completed' })
      .getCount();

    return { contractsCreated, tasksCompleted };
  }

  /**
   * Get all notification schedules
   */
  async getSchedules(): Promise<NotificationSchedule[]> {
    return await this.scheduleRepository.find({
      order: { notificationType: 'ASC' },
    });
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(id: number): Promise<NotificationSchedule | null> {
    return await this.scheduleRepository.findOne({ where: { id } });
  }

  /**
   * Update schedule
   */
  async updateSchedule(
    id: number,
    data: Partial<NotificationSchedule>
  ): Promise<NotificationSchedule> {
    const schedule = await this.getScheduleById(id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    Object.assign(schedule, data);
    return await this.scheduleRepository.save(schedule);
  }

  /**
   * Wysyła dzienny digest alertów magazynowych
   */
  async sendDailyStockAlertsDigest(): Promise<void> {
    try {
      console.log('📊 Generowanie dziennego digestu alertów magazynowych...');

      // Pobierz materiały o niskim stanie
      const lowStockItems = await this.stockRepository
        .createQueryBuilder('stock')
        .where('stock.quantityInStock < stock.minStockLevel')
        .andWhere('stock.minStockLevel IS NOT NULL')
        .andWhere('stock.quantityInStock >= 0')
        .orderBy('stock.quantityInStock', 'ASC')
        .getMany();

      if (lowStockItems.length === 0) {
        console.log('✅ Brak materiałów o niskim stanie - digest nie zostanie wysłany');
        return;
      }

      // Przygotuj dane dla digestu
      const alertsData = lowStockItems.map(item => ({
        materialName: item.materialName,
        catalogNumber: item.catalogNumber,
        currentStock: item.quantityInStock,
        minStockLevel: item.minStockLevel,
        unit: item.unit,
        warehouseLocation: item.warehouseLocation || 'Nie określono',
        category: item.category || 'Brak kategorii',
        status: item.quantityInStock === 0 ? 'CRITICAL' : 'LOW',
        stockUrl: `${process.env.FRONTEND_URL}/warehouse-stock/${item.id}`,
      }));

      // Pobierz emaile magazynierów i managerów
      const recipients = await this.getEmailsByRoles(['warehouse_manager', 'manager', 'admin']);

      if (recipients.length === 0) {
        console.warn('⚠️  Brak odbiorców dla dziennego digestu alertów magazynowych');
        return;
      }

      const criticalCount = alertsData.filter(a => a.status === 'CRITICAL').length;
      const lowCount = alertsData.filter(a => a.status === 'LOW').length;

      for (const email of recipients) {
        await EmailQueueService.addToQueue({
          to: email,
          subject: `📦 Dzienny raport stanów magazynowych - ${new Date().toLocaleDateString('pl-PL')}`,
          template: EmailTemplate.STOCK_ALERTS_DIGEST,
          context: {
            date: new Date().toLocaleDateString('pl-PL'),
            totalAlerts: alertsData.length,
            criticalCount,
            lowCount,
            alerts: alertsData,
            warehouseUrl: `${process.env.FRONTEND_URL}/warehouse-stock`,
          },
          priority: 'high'
        });
      }

      SlackWebhookService.notifyStockDigest({
        date: new Date().toLocaleDateString('pl-PL'),
        totalAlerts: alertsData.length,
        criticalCount,
        lowCount,
        warehouseUrl: `${process.env.FRONTEND_URL}/warehouse-stock`,
      }).catch(err => console.error('[Slack] notifyStockDigest error:', err));

      console.log(`✅ Dzienny digest alertów magazynowych wysłany (${alertsData.length} alertów)`);
    } catch (error) {
      console.error('❌ Błąd wysyłania dziennego digestu alertów magazynowych:', error);
    }
  }

  /**
   * Zatrzymuje wszystkie zadania cron
   */
  stopAll(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️  Zatrzymano zadanie: ${name}`);
    });
    this.jobs.clear();
    this.initialized = false;
    console.log('👋 NotificationSchedulerService zatrzymany');
  }
}

export default new NotificationSchedulerService();

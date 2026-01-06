// src/services/NotificationService.ts
// Serwis powiadomień email dla workflow

import EmailService from './EmailService';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { CompletionOrder } from '../entities/CompletionOrder';
import { PrefabricationTask } from '../entities/PrefabricationTask';

/**
 * Stałe konfiguracyjne
 */
const SYSTEM_EMAIL = 'smokip@der-mag.pl';

/**
 * Typy ról dla filtrowania odbiorców
 */
type RoleFilter = 'workers' | 'admins' | 'managers' | 'prefabricators' | 'coordinators';

export class NotificationService {
  /**
   * Pobiera użytkowników według ról
   */
  private async getUsersByRoles(roleFilters: RoleFilter[]): Promise<User[]> {
    const userRepo = AppDataSource.getRepository(User);
    
    const queryBuilder = userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.isActive = :isActive', { isActive: true });

    // Mapowanie nazw ról
    const roleNames: string[] = [];
    
    if (roleFilters.includes('admins')) {
      roleNames.push('admin');
    }
    if (roleFilters.includes('managers')) {
      roleNames.push('manager', 'project_manager');
    }
    if (roleFilters.includes('workers')) {
      roleNames.push('worker', 'field_worker');
    }
    if (roleFilters.includes('prefabricators')) {
      roleNames.push('prefabricator', 'technician');
    }
    if (roleFilters.includes('coordinators')) {
      roleNames.push('coordinator', 'logistics');
    }

    if (roleNames.length > 0) {
      queryBuilder.andWhere('role.name IN (:...roleNames)', { roleNames });
    }

    const users = await queryBuilder.getMany();
    return users.filter(user => user.email); // Tylko użytkownicy z emailem
  }

  /**
   * Pobiera adresy email użytkowników według ról
   */
  private async getEmailsByRoles(roleFilters: RoleFilter[]): Promise<string[]> {
    const users = await this.getUsersByRoles(roleFilters);
    return users.map(user => user.email).filter(Boolean);
  }

  /**
   * Nowe zadanie kompletacji (1.7)
   * Odbiorcy: workers, admins, managers
   */
  async notifyNewCompletionTask(completionOrderId: number): Promise<void> {
    try {
      const orderRepo = AppDataSource.getRepository(CompletionOrder);
      const order = await orderRepo.findOne({
        where: { id: completionOrderId },
        relations: ['subsystem', 'subsystem.contract', 'assignedTo', 'generatedBom']
      });

      if (!order) {
        console.error('Zlecenie kompletacji nie znalezione');
        return;
      }

      const recipients = await this.getEmailsByRoles(['workers', 'admins', 'managers']);
      
      if (recipients.length === 0) {
        console.warn('Brak odbiorców dla powiadomienia o nowym zadaniu kompletacji');
        return;
      }

      await EmailService.sendEmail({
        to: recipients,
        subject: `Nowe zadanie kompletacji - ${order.subsystem.subsystemNumber}`,
        template: 'completion-new-task',
        context: {
          orderId: order.id,
          subsystemNumber: order.subsystem.subsystemNumber,
          contractNumber: order.subsystem.contract.contractNumber,
          assignedTo: order.assignedTo.username,
          itemCount: order.items?.length || 0,
          createdAt: order.createdAt
        }
      });

      console.log(`✅ Wysłano powiadomienie o nowym zadaniu kompletacji #${completionOrderId}`);
    } catch (error) {
      console.error('Błąd wysyłania powiadomienia o nowym zadaniu kompletacji:', error);
    }
  }

  /**
   * Zgłoszenie braków (2.4)
   * Odbiorcy: smokip@der-mag.pl, managers
   */
  async notifyMaterialShortage(completionOrderId: number, missingItems: any[]): Promise<void> {
    try {
      const orderRepo = AppDataSource.getRepository(CompletionOrder);
      const order = await orderRepo.findOne({
        where: { id: completionOrderId },
        relations: ['subsystem', 'subsystem.contract']
      });

      if (!order) {
        console.error('Zlecenie kompletacji nie znalezione');
        return;
      }

      const managerEmails = await this.getEmailsByRoles(['managers']);
      const recipients = [SYSTEM_EMAIL, ...managerEmails];

      await EmailService.sendEmail({
        to: recipients,
        subject: `⚠️ Zgłoszenie braków materiałowych - ${order.subsystem.subsystemNumber}`,
        template: 'completion-material-shortage',
        context: {
          orderId: order.id,
          subsystemNumber: order.subsystem.subsystemNumber,
          contractNumber: order.subsystem.contract.contractNumber,
          missingItems,
          missingItemsCount: missingItems.length
        },
        priority: 'high'
      });

      console.log(`✅ Wysłano powiadomienie o brakach materiałowych dla zlecenia #${completionOrderId}`);
    } catch (error) {
      console.error('Błąd wysyłania powiadomienia o brakach materiałowych:', error);
    }
  }

  /**
   * Zakończenie kompletacji (2.6)
   * Odbiorcy: smokip@der-mag.pl, prefabricators, managers, workers
   */
  async notifyCompletionFinished(completionOrderId: number): Promise<void> {
    try {
      const orderRepo = AppDataSource.getRepository(CompletionOrder);
      const order = await orderRepo.findOne({
        where: { id: completionOrderId },
        relations: ['subsystem', 'subsystem.contract', 'items', 'items.bomItem']
      });

      if (!order) {
        console.error('Zlecenie kompletacji nie znalezione');
        return;
      }

      const roleEmails = await this.getEmailsByRoles(['prefabricators', 'managers', 'workers']);
      const recipients = [SYSTEM_EMAIL, ...roleEmails];

      // Przygotuj listę skompletowanych elementów
      const completedItems = order.items
        .filter(item => item.status === 'SCANNED')
        .map(item => ({
          name: item.bomItem?.itemName || 'Nieznany',
          quantity: item.scannedQuantity
        }));

      await EmailService.sendEmail({
        to: recipients,
        subject: `✅ Zakończono kompletację - ${order.subsystem.subsystemNumber}`,
        template: 'completion-finished',
        context: {
          orderId: order.id,
          subsystemNumber: order.subsystem.subsystemNumber,
          contractNumber: order.subsystem.contract.contractNumber,
          completedItems,
          totalItems: order.items.length,
          completedAt: order.completedAt
        }
      });

      console.log(`✅ Wysłano powiadomienie o zakończeniu kompletacji #${completionOrderId}`);
    } catch (error) {
      console.error('Błąd wysyłania powiadomienia o zakończeniu kompletacji:', error);
    }
  }

  /**
   * Nowe zadanie prefabrykacji (2.8)
   * Odbiorcy: prefabricators
   */
  async notifyNewPrefabricationTask(prefabTaskId: number): Promise<void> {
    try {
      const taskRepo = AppDataSource.getRepository(PrefabricationTask);
      const task = await taskRepo.findOne({
        where: { id: prefabTaskId },
        relations: ['subsystem', 'subsystem.contract', 'assignedTo', 'completionOrder']
      });

      if (!task) {
        console.error('Zadanie prefabrykacji nie znalezione');
        return;
      }

      const recipients = await this.getEmailsByRoles(['prefabricators']);

      if (recipients.length === 0) {
        console.warn('Brak odbiorców dla powiadomienia o nowym zadaniu prefabrykacji');
        return;
      }

      await EmailService.sendEmail({
        to: recipients,
        subject: `Nowe zadanie prefabrykacji - ${task.subsystem.subsystemNumber}`,
        template: 'prefabrication-new-task',
        context: {
          taskId: task.id,
          subsystemNumber: task.subsystem.subsystemNumber,
          contractNumber: task.subsystem.contract.contractNumber,
          assignedTo: task.assignedTo.username,
          completionOrderId: task.completionOrderId,
          createdAt: task.createdAt
        }
      });

      console.log(`✅ Wysłano powiadomienie o nowym zadaniu prefabrykacji #${prefabTaskId}`);
    } catch (error) {
      console.error('Błąd wysyłania powiadomienia o nowym zadaniu prefabrykacji:', error);
    }
  }

  /**
   * Zakończenie prefabrykacji (3.4)
   * Odbiorcy: managers, coordinators
   */
  async notifyPrefabricationCompleted(prefabTaskId: number): Promise<void> {
    try {
      const taskRepo = AppDataSource.getRepository(PrefabricationTask);
      const task = await taskRepo.findOne({
        where: { id: prefabTaskId },
        relations: ['subsystem', 'subsystem.contract', 'devices']
      });

      if (!task) {
        console.error('Zadanie prefabrykacji nie znalezione');
        return;
      }

      const recipients = await this.getEmailsByRoles(['managers', 'coordinators']);

      if (recipients.length === 0) {
        console.warn('Brak odbiorców dla powiadomienia o zakończeniu prefabrykacji');
        return;
      }

      await EmailService.sendEmail({
        to: recipients,
        subject: `✅ Zakończono prefabrykację - ${task.subsystem.subsystemNumber}`,
        template: 'prefabrication-completed',
        context: {
          taskId: task.id,
          subsystemNumber: task.subsystem.subsystemNumber,
          contractNumber: task.subsystem.contract.contractNumber,
          deviceCount: task.devices?.length || 0,
          completedAt: task.completedAt
        }
      });

      console.log(`✅ Wysłano powiadomienie o zakończeniu prefabrykacji #${prefabTaskId}`);
    } catch (error) {
      console.error('Błąd wysyłania powiadomienia o zakończeniu prefabrykacji:', error);
    }
  }

  /**
   * Zadanie instalacji (placeholder na przyszłość)
   * Odbiorcy: workers
   */
  async notifyInstallationTask(taskId: number): Promise<void> {
    try {
      const recipients = await this.getEmailsByRoles(['workers']);

      if (recipients.length === 0) {
        console.warn('Brak odbiorców dla powiadomienia o zadaniu instalacji');
        return;
      }

      await EmailService.sendEmail({
        to: recipients,
        subject: `Nowe zadanie instalacji`,
        template: 'installation-new-task',
        context: {
          taskId
        }
      });

      console.log(`✅ Wysłano powiadomienie o zadaniu instalacji #${taskId}`);
    } catch (error) {
      console.error('Błąd wysyłania powiadomienia o zadaniu instalacji:', error);
    }
  }

  /**
   * Wysyłanie emaila z danymi dostępowymi nowo utworzonego użytkownika
   * Odbiorcy: nowy użytkownik
   */
  static async sendUserCreatedEmail(user: User, password: string): Promise<void> {
    try {
      await EmailService.initialize();
      
      const subject = 'Twoje konto w systemie Grover Platform zostało utworzone';
      
      // Use the same template as in UserController.create method
      await EmailService.sendEmail({
        to: user.email,
        subject: subject,
        template: 'user-created-with-password',
        context: {
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          password: password,
          systemUrl: process.env.APP_URL || 'http://localhost:3000',
          loginUrl: `${process.env.APP_URL || 'http://localhost:3000'}/login`,
          supportEmail: process.env.SUPPORT_EMAIL || 'smokip@der-mag.pl'
        }
      });

      console.log(`✅ Wysłano email z danymi dostępowymi do użytkownika ${user.email}`);
    } catch (error) {
      console.error('Błąd wysyłania emaila z danymi dostępowymi:', error);
      // Don't throw - email failure shouldn't prevent user creation
    }
  }
}

export default new NotificationService();

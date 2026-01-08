// src/services/ContractNotificationService.ts
// Serwis powiadomień dla kontraktów

import { AppDataSource } from '../config/database';
import { Contract } from '../entities/Contract';
import { User } from '../entities/User';
import EmailQueueService from './EmailQueueService';
import { EmailTemplate } from '../types/EmailTypes';

export class ContractNotificationService {
  private contractRepository = AppDataSource.getRepository(Contract);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Pobiera szczegóły kontraktu
   */
  private async getContractDetails(contractId: number): Promise<Contract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
      relations: ['projectManager']
    });

    if (!contract) {
      throw new Error(`Kontrakt ${contractId} nie został znaleziony`);
    }

    return contract;
  }

  /**
   * Pobiera użytkownika po ID
   */
  private async getUserById(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error(`Użytkownik ${userId} nie został znaleziony`);
    }

    return user;
  }

  /**
   * Pobiera emaile managerów
   */
  private async getManagerEmails(): Promise<string[]> {
    const managers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.name IN (:...roles)', { roles: ['manager', 'admin'] })
      .andWhere('user.active = :active', { active: true })
      .getMany();

    return managers.map(m => m.email);
  }

  /**
   * Pobiera emaile adminów
   */
  private async getAdminEmails(): Promise<string[]> {
    const admins = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.name = :role', { role: 'admin' })
      .andWhere('user.active = :active', { active: true })
      .getMany();

    return admins.map(a => a.email);
  }

  /**
   * Powiadomienie o utworzeniu kontraktu
   */
  async notifyContractCreated(contractId: number, createdById: number): Promise<void> {
    try {
      const contract = await this.getContractDetails(contractId);
      const createdBy = await this.getUserById(createdById);
      const managers = await this.getManagerEmails();

      for (const email of managers) {
        await EmailQueueService.addToQueue({
          to: email,
          subject: `Nowy kontrakt: ${contract.contractNumber} - ${contract.customName}`,
          template: EmailTemplate.CONTRACT_CREATED,
          context: {
            contractNumber: contract.contractNumber,
            customName: contract.customName,
            orderDate: contract.orderDate?.toLocaleDateString('pl-PL') || 'Brak daty',
            projectManager: `${contract.projectManager.firstName} ${contract.projectManager.lastName}`,
            createdBy: `${createdBy.firstName} ${createdBy.lastName}`,
            contractUrl: `${process.env.FRONTEND_URL}/contracts/${contractId}`,
          }
        });
      }

      console.log(`✅ Powiadomienia o utworzeniu kontraktu ${contract.contractNumber} wysłane`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomienia o utworzeniu kontraktu:', error);
    }
  }

  /**
   * Powiadomienie o zatwierdzeniu kontraktu
   */
  async notifyContractApproved(contractId: number, approvedById: number): Promise<void> {
    try {
      const contract = await this.getContractDetails(contractId);
      const approvedBy = await this.getUserById(approvedById);
      const admins = await this.getAdminEmails();

      // Powiadomienie do PM kontraktu
      const recipients = [contract.projectManager.email, ...admins];

      for (const email of recipients) {
        await EmailQueueService.addToQueue({
          to: email,
          subject: `✅ Kontrakt zatwierdzony: ${contract.contractNumber}`,
          template: EmailTemplate.CONTRACT_APPROVED,
          context: {
            contractNumber: contract.contractNumber,
            customName: contract.customName,
            orderDate: contract.orderDate?.toLocaleDateString('pl-PL') || 'Brak daty',
            projectManager: `${contract.projectManager.firstName} ${contract.projectManager.lastName}`,
            approvedBy: `${approvedBy.firstName} ${approvedBy.lastName}`,
            contractUrl: `${process.env.FRONTEND_URL}/contracts/${contractId}`,
          },
          priority: 'high'
        });
      }

      console.log(`✅ Powiadomienia o zatwierdzeniu kontraktu ${contract.contractNumber} wysłane`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomienia o zatwierdzeniu kontraktu:', error);
    }
  }

  /**
   * Powiadomienie o anulowaniu kontraktu
   */
  async notifyContractCancelled(contractId: number, cancelledById: number, reason?: string): Promise<void> {
    try {
      const contract = await this.getContractDetails(contractId);
      const cancelledBy = await this.getUserById(cancelledById);
      const admins = await this.getAdminEmails();

      // Powiadomienie do PM kontraktu i adminów
      const recipients = [contract.projectManager.email, ...admins];

      for (const email of recipients) {
        await EmailQueueService.addToQueue({
          to: email,
          subject: `❌ Kontrakt anulowany: ${contract.contractNumber}`,
          template: EmailTemplate.CONTRACT_CANCELLED,
          context: {
            contractNumber: contract.contractNumber,
            customName: contract.customName,
            orderDate: contract.orderDate?.toLocaleDateString('pl-PL') || 'Brak daty',
            projectManager: `${contract.projectManager.firstName} ${contract.projectManager.lastName}`,
            cancelledBy: `${cancelledBy.firstName} ${cancelledBy.lastName}`,
            reason: reason || 'Nie podano przyczyny',
            contractUrl: `${process.env.FRONTEND_URL}/contracts/${contractId}`,
          },
          priority: 'high'
        });
      }

      console.log(`✅ Powiadomienia o anulowaniu kontraktu ${contract.contractNumber} wysłane`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomienia o anulowaniu kontraktu:', error);
    }
  }

  /**
   * Powiadomienie o zbliżającym się deadline
   */
  async notifyContractDeadline(contractId: number, daysRemaining: number): Promise<void> {
    try {
      const contract = await this.getContractDetails(contractId);

      await EmailQueueService.addToQueue({
        to: contract.projectManager.email,
        subject: `⚠️ Zbliżający się termin: ${contract.contractNumber} (${daysRemaining} dni)`,
        template: EmailTemplate.CONTRACT_DEADLINE_REMINDER,
        context: {
          contractNumber: contract.contractNumber,
          customName: contract.customName,
          orderDate: contract.orderDate?.toLocaleDateString('pl-PL') || 'Brak daty',
          projectManager: `${contract.projectManager.firstName} ${contract.projectManager.lastName}`,
          daysRemaining,
          contractUrl: `${process.env.FRONTEND_URL}/contracts/${contractId}`,
        },
        priority: daysRemaining <= 3 ? 'high' : 'normal'
      });

      console.log(`✅ Powiadomienie o deadline kontraktu ${contract.contractNumber} wysłane (${daysRemaining} dni)`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomienia o deadline kontraktu:', error);
    }
  }
}

export default new ContractNotificationService();

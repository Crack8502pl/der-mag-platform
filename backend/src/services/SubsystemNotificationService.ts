// src/services/SubsystemNotificationService.ts
// Serwis powiadomień dla podsystemów

import { AppDataSource } from '../config/database';
import { Subsystem, SubsystemStatus } from '../entities/Subsystem';
import { User } from '../entities/User';
import EmailQueueService from './EmailQueueService';
import { EmailTemplate } from '../types/EmailTypes';

export class SubsystemNotificationService {
  private subsystemRepository = AppDataSource.getRepository(Subsystem);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Pobiera szczegóły podsystemu
   */
  private async getSubsystemDetails(subsystemId: number): Promise<Subsystem> {
    const subsystem = await this.subsystemRepository.findOne({
      where: { id: subsystemId },
      relations: ['contract', 'contract.projectManager']
    });

    if (!subsystem) {
      throw new Error(`Podsystem ${subsystemId} nie został znaleziony`);
    }

    return subsystem;
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
   * Pobiera emaile adminów sieciowych
   */
  private async getNetworkAdminEmails(): Promise<string[]> {
    const admins = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.name IN (:...roles)', { roles: ['network_admin', 'admin'] })
      .andWhere('user.active = :active', { active: true })
      .getMany();

    return admins.map(a => a.email);
  }

  /**
   * Powiadomienie o utworzeniu podsystemu
   */
  async notifySubsystemCreated(subsystemId: number, createdById: number): Promise<void> {
    try {
      const subsystem = await this.getSubsystemDetails(subsystemId);
      const createdBy = await this.getUserById(createdById);

      await EmailQueueService.addToQueue({
        to: subsystem.contract.projectManager.email,
        subject: `Nowy podsystem: ${subsystem.subsystemNumber} - ${subsystem.systemType}`,
        template: EmailTemplate.SUBSYSTEM_CREATED,
        context: {
          subsystemNumber: subsystem.subsystemNumber,
          systemType: subsystem.systemType,
          quantity: subsystem.quantity,
          contractNumber: subsystem.contract.contractNumber,
          contractName: subsystem.contract.customName,
          projectManager: `${subsystem.contract.projectManager.firstName} ${subsystem.contract.projectManager.lastName}`,
          createdBy: `${createdBy.firstName} ${createdBy.lastName}`,
          subsystemUrl: `${process.env.FRONTEND_URL}/subsystems/${subsystemId}`,
        }
      });

      console.log(`✅ Powiadomienie o utworzeniu podsystemu ${subsystem.subsystemNumber} wysłane`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomienia o utworzeniu podsystemu:', error);
    }
  }

  /**
   * Powiadomienie o zmianie statusu podsystemu
   */
  async notifySubsystemStatusChanged(
    subsystemId: number,
    oldStatus: SubsystemStatus,
    newStatus: SubsystemStatus,
    changedById: number
  ): Promise<void> {
    try {
      const subsystem = await this.getSubsystemDetails(subsystemId);
      const changedBy = await this.getUserById(changedById);

      await EmailQueueService.addToQueue({
        to: subsystem.contract.projectManager.email,
        subject: `Status zmieniony: ${subsystem.subsystemNumber} → ${newStatus}`,
        template: EmailTemplate.SUBSYSTEM_STATUS_CHANGED,
        context: {
          subsystemNumber: subsystem.subsystemNumber,
          systemType: subsystem.systemType,
          oldStatus: oldStatus,
          newStatus: newStatus,
          contractNumber: subsystem.contract.contractNumber,
          contractName: subsystem.contract.customName,
          projectManager: `${subsystem.contract.projectManager.firstName} ${subsystem.contract.projectManager.lastName}`,
          changedBy: `${changedBy.firstName} ${changedBy.lastName}`,
          subsystemUrl: `${process.env.FRONTEND_URL}/subsystems/${subsystemId}`,
        }
      });

      console.log(`✅ Powiadomienie o zmianie statusu podsystemu ${subsystem.subsystemNumber} wysłane`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomienia o zmianie statusu podsystemu:', error);
    }
  }

  /**
   * Powiadomienie o alokacji sieci
   */
  async notifyNetworkAllocated(subsystemId: number, networkDetails: string): Promise<void> {
    try {
      const subsystem = await this.getSubsystemDetails(subsystemId);
      const networkAdmins = await this.getNetworkAdminEmails();

      // Powiadomienie do PM kontraktu
      const recipients = [subsystem.contract.projectManager.email, ...networkAdmins];

      for (const email of recipients) {
        await EmailQueueService.addToQueue({
          to: email,
          subject: `🌐 Sieć alokowana: ${subsystem.subsystemNumber}`,
          template: EmailTemplate.SUBSYSTEM_NETWORK_ALLOCATED,
          context: {
            subsystemNumber: subsystem.subsystemNumber,
            systemType: subsystem.systemType,
            networkDetails: networkDetails,
            contractNumber: subsystem.contract.contractNumber,
            contractName: subsystem.contract.customName,
            projectManager: `${subsystem.contract.projectManager.firstName} ${subsystem.contract.projectManager.lastName}`,
            subsystemUrl: `${process.env.FRONTEND_URL}/subsystems/${subsystemId}`,
          }
        });
      }

      console.log(`✅ Powiadomienia o alokacji sieci dla ${subsystem.subsystemNumber} wysłane`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomienia o alokacji sieci:', error);
    }
  }
}

export default new SubsystemNotificationService();

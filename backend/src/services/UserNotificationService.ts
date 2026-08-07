// src/services/UserNotificationService.ts
// Serwis powiadomień użytkowników

import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import EmailQueueService from './EmailQueueService';
import { EmailTemplate } from '../types/EmailTypes';

export class UserNotificationService {
  private userRepository = AppDataSource.getRepository(User);
  private roleRepository = AppDataSource.getRepository(Role);

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
   * Powiadomienie o zmianie roli użytkownika
   */
  async notifyRoleChanged(
    user: User,
    oldRole: Role,
    newRole: Role,
    changedById: number
  ): Promise<void> {
    try {
      const changedBy = await this.userRepository.findOne({
        where: { id: changedById }
      });

      await EmailQueueService.addToQueue({
        to: user.email,
        subject: `Zmiana uprawnień w systemie Grover Platform`,
        template: EmailTemplate.USER_ROLE_CHANGED,
        context: {
          userName: `${user.firstName} ${user.lastName}`,
          oldRole: oldRole.name,
          newRole: newRole.name,
          changedBy: changedBy ? `${changedBy.firstName} ${changedBy.lastName}` : 'Administrator',
          loginUrl: `${process.env.FRONTEND_URL}/login`,
        },
        automation: { automated: true, recipientUserId: user.id }
      });

      console.log(`✅ Powiadomienie o zmianie roli wysłane do ${user.email}`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomienia o zmianie roli:', error);
    }
  }

  /**
   * Powiadomienie o zablokowaniu konta
   */
  async notifyAccountBlocked(
    user: User,
    blockedById: number,
    reason?: string
  ): Promise<void> {
    try {
      const blockedBy = await this.userRepository.findOne({
        where: { id: blockedById }
      });
      const admins = await this.getAdminEmails();

      // Powiadomienie do użytkownika
      await EmailQueueService.addToQueue({
        to: user.email,
        subject: `⛔ Twoje konto zostało zablokowane`,
        template: EmailTemplate.USER_ACCOUNT_BLOCKED,
        context: {
          userName: `${user.firstName} ${user.lastName}`,
          blockedBy: blockedBy ? `${blockedBy.firstName} ${blockedBy.lastName}` : 'Administrator',
          reason: reason || 'Nie podano przyczyny',
          supportEmail: process.env.SUPPORT_EMAIL || 'support@grover.pl',
        },
        priority: 'high',
        automation: { automated: true, recipientUserId: user.id }
      });

      // Powiadomienie do adminów
      for (const adminEmail of admins) {
        await EmailQueueService.addToQueue({
          to: adminEmail,
          subject: `🔒 Konto zablokowane: ${user.email}`,
          template: EmailTemplate.USER_ACCOUNT_BLOCKED,
          context: {
            userName: `${user.firstName} ${user.lastName}`,
            userEmail: user.email,
            blockedBy: blockedBy ? `${blockedBy.firstName} ${blockedBy.lastName}` : 'Administrator',
            reason: reason || 'Nie podano przyczyny',
            supportEmail: process.env.SUPPORT_EMAIL || 'support@grover.pl',
          },
          automation: { automated: true }
        });
      }

      console.log(`✅ Powiadomienia o zablokowaniu konta ${user.email} wysłane`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomienia o zablokowaniu konta:', error);
    }
  }

  /**
   * Powiadomienie o odblokowaniu konta
   */
  async notifyAccountUnblocked(
    user: User,
    unblockedById: number
  ): Promise<void> {
    try {
      const unblockedBy = await this.userRepository.findOne({
        where: { id: unblockedById }
      });

      await EmailQueueService.addToQueue({
        to: user.email,
        subject: `✅ Twoje konto zostało odblokowane`,
        template: EmailTemplate.USER_ACCOUNT_UNBLOCKED,
        context: {
          userName: `${user.firstName} ${user.lastName}`,
          unblockedBy: unblockedBy ? `${unblockedBy.firstName} ${unblockedBy.lastName}` : 'Administrator',
          loginUrl: `${process.env.FRONTEND_URL}/login`,
        },
        automation: { automated: true, recipientUserId: user.id }
      });

      console.log(`✅ Powiadomienie o odblokowaniu konta ${user.email} wysłane`);
    } catch (error) {
      console.error('❌ Błąd wysyłania powiadomienia o odblokowaniu konta:', error);
    }
  }
}

export default new UserNotificationService();

import { IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { EmailAutomationAuditLog } from '../entities/EmailAutomationAuditLog';
import { SystemConfig } from '../entities/SystemConfig';
import { User } from '../entities/User';
import EmailAutomationGuardService from './EmailAutomationGuardService';

const EMAIL_AUTOMATION_KEY = 'email_automation_enabled';
export const EMAIL_AUTOMATION_REASON_MAX_LENGTH = 500;

export class EmailAutomationAdminService {
  private readonly systemConfigRepository = AppDataSource.getRepository(SystemConfig);
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly auditRepository = AppDataSource.getRepository(EmailAutomationAuditLog);

  async getGlobalSetting(): Promise<{ enabled: boolean }> {
    return {
      enabled: await EmailAutomationGuardService.isGlobalEnabled(),
    };
  }

  async setGlobalSetting(enabled: boolean, actorAdminId: number): Promise<{ enabled: boolean }> {
    const existing = await this.systemConfigRepository.findOne({
      where: { key: EMAIL_AUTOMATION_KEY },
    });

    const oldValue = existing?.value ?? 'true';
    const newValue = String(enabled);

    if (existing) {
      existing.value = newValue;
      existing.category = existing.category || 'email_automation';
      existing.updatedById = actorAdminId;
      await this.systemConfigRepository.save(existing);
    } else {
      await this.systemConfigRepository.save(
        this.systemConfigRepository.create({
          key: EMAIL_AUTOMATION_KEY,
          value: newValue,
          category: 'email_automation',
          isEncrypted: false,
          updatedById: actorAdminId,
        }),
      );
    }

    await this.auditRepository.save(
      this.auditRepository.create({
        actorAdminId,
        targetType: 'system',
        targetId: null,
        field: EMAIL_AUTOMATION_KEY,
        oldValue,
        newValue,
      }),
    );

    EmailAutomationGuardService.invalidateGlobalCache();

    return { enabled };
  }

  async setUserPause(
    userId: number,
    paused: boolean,
    actorAdminId: number,
    reason?: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, deletedAt: IsNull() },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const trimmedReason = reason?.trim() || null;
    const oldValue = String(user.emailAutomationPaused);
    const newValue = String(paused);
    const oldReason = user.emailAutomationPauseReason;
    const nextReason = paused ? trimmedReason : null;

    user.emailAutomationPaused = paused;
    user.emailAutomationPauseReason = nextReason;
    user.emailAutomationPausedAt = paused ? new Date() : null;
    user.emailAutomationPausedBy = paused ? actorAdminId : null;

    const savedUser = await this.userRepository.save(user);

    await this.auditRepository.save(
      this.auditRepository.create({
        actorAdminId,
        targetType: 'user',
        targetId: user.id,
        field: 'email_automation_paused',
        oldValue,
        newValue,
      }),
    );

    if (oldReason !== nextReason) {
      await this.auditRepository.save(
        this.auditRepository.create({
          actorAdminId,
          targetType: 'user',
          targetId: user.id,
          field: 'email_automation_pause_reason',
          oldValue: oldReason,
          newValue: nextReason,
        }),
      );
    }

    EmailAutomationGuardService.invalidateUserCache(user.id);

    return savedUser;
  }
}

export default new EmailAutomationAdminService();

import { In, IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';
import { User } from '../entities/User';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const DEFAULT_GLOBAL_ENABLED = true;
const CACHE_TTL_MS = 5_000;

export class EmailAutomationUserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User ${userId} not found`);
    this.name = 'EmailAutomationUserNotFoundError';
  }
}

export class EmailAutomationGuardService {
  private readonly systemConfigRepository = AppDataSource.getRepository(SystemConfig);
  private readonly userRepository = AppDataSource.getRepository(User);
  private globalEnabledCache: CacheEntry<boolean> | null = null;
  private userPauseCache = new Map<number, CacheEntry<boolean>>();

  async isGlobalEnabled(): Promise<boolean> {
    const cached = this.globalEnabledCache;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const config = await this.systemConfigRepository.findOne({
      where: { key: 'email_automation_enabled' },
    });

    const value = config ? config.value === 'true' : DEFAULT_GLOBAL_ENABLED;
    this.globalEnabledCache = {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return value;
  }

  async isUserPaused(userId: string): Promise<boolean> {
    const normalizedUserId = Number(userId);
    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      throw new EmailAutomationUserNotFoundError(userId);
    }

    const cached = this.userPauseCache.get(normalizedUserId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const user = await this.userRepository.findOne({
      where: { id: normalizedUserId, deletedAt: IsNull() },
      select: ['id', 'emailAutomationPaused'],
    });

    if (!user) {
      throw new EmailAutomationUserNotFoundError(userId);
    }

    const value = Boolean(user.emailAutomationPaused);
    this.userPauseCache.set(normalizedUserId, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return value;
  }

  async canSendAutomatedEmail(userId: string): Promise<boolean> {
    const globalEnabled = await this.isGlobalEnabled();
    if (!globalEnabled) {
      return false;
    }

    try {
      return !(await this.isUserPaused(userId));
    } catch (error) {
      if (error instanceof EmailAutomationUserNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  async filterAutomatedRecipients(
    recipients: string | string[],
    recipientUserId?: number | null,
  ): Promise<string[]> {
    if (!(await this.isGlobalEnabled())) {
      return [];
    }

    const normalizedRecipients = (Array.isArray(recipients) ? recipients : [recipients])
      .map(recipient => recipient.trim())
      .filter(Boolean);

    if (normalizedRecipients.length === 0) {
      return [];
    }

    if (recipientUserId !== null && recipientUserId !== undefined) {
      try {
        const isPaused = await this.isUserPaused(String(recipientUserId));
        return isPaused ? [] : normalizedRecipients;
      } catch (error) {
        if (error instanceof EmailAutomationUserNotFoundError) {
          return [];
        }
        throw error;
      }
    }

    const users = await this.userRepository.find({
      where: {
        email: In(normalizedRecipients),
        deletedAt: IsNull(),
      },
      select: ['id', 'email', 'emailAutomationPaused'],
    });

    const usersByEmail = new Map(
      users.map(user => [user.email.toLowerCase(), user]),
    );

    const cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    for (const user of users) {
      this.userPauseCache.set(user.id, {
        value: Boolean(user.emailAutomationPaused),
        expiresAt: cacheExpiresAt,
      });
    }

    const allowedRecipients: string[] = [];
    for (const recipient of normalizedRecipients) {
      const matchingUser = usersByEmail.get(recipient.toLowerCase());
      if (!matchingUser || !matchingUser.emailAutomationPaused) {
        allowedRecipients.push(recipient);
      }
    }

    return allowedRecipients;
  }

  invalidateGlobalCache(): void {
    this.globalEnabledCache = null;
  }

  invalidateUserCache(userId?: number): void {
    if (userId !== undefined) {
      this.userPauseCache.delete(userId);
      return;
    }

    this.userPauseCache.clear();
  }
}

export default new EmailAutomationGuardService();

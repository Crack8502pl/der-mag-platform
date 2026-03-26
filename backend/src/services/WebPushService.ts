// src/services/WebPushService.ts
// Web Push notification service

import webpush from 'web-push';
import { AppDataSource } from '../config/database';
import { PushSubscription } from '../entities/PushSubscription';
import { User } from '../entities/User';
import { Role } from '../entities/Role';

// Allowed push service domains for endpoint validation
const ALLOWED_PUSH_DOMAINS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'wns.windows.com',
  'web.push.apple.com',
  'notify.windows.com',
  'push.apple.com'
];

const MAX_DEVICES_PER_USER = 5;

// Configure VAPID details
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO || 'mailto:smokip@der-mag.pl',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export class WebPushService {
  /**
   * Validates that the endpoint URL belongs to a known push service
   */
  validateEndpoint(endpoint: string): boolean {
    try {
      const url = new URL(endpoint);
      return ALLOWED_PUSH_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain));
    } catch {
      return false;
    }
  }

  /**
   * Save (or update) a push subscription for a user
   */
  async saveSubscription(
    userId: number,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string }; expirationTime?: number | null }
  ): Promise<void> {
    if (!this.validateEndpoint(subscription.endpoint)) {
      throw new Error('Nieprawidłowy endpoint push');
    }

    const repo = AppDataSource.getRepository(PushSubscription);

    // Check device limit per user
    const existingCount = await repo.count({ where: { userId } });
    const existingByEndpoint = await repo.findOne({ where: { endpoint: subscription.endpoint } });

    if (!existingByEndpoint && existingCount >= MAX_DEVICES_PER_USER) {
      // Remove the oldest subscription to make room
      const oldest = await repo.findOne({
        where: { userId },
        order: { createdAt: 'ASC' }
      });
      if (oldest) {
        await repo.delete(oldest.id);
      }
    }

    if (existingByEndpoint) {
      // Update existing subscription
      existingByEndpoint.userId = userId;
      existingByEndpoint.p256dh = subscription.keys.p256dh;
      existingByEndpoint.auth = subscription.keys.auth;
      existingByEndpoint.expiresAt = subscription.expirationTime
        ? new Date(subscription.expirationTime)
        : null;
      await repo.save(existingByEndpoint);
    } else {
      const newSub = repo.create({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        expiresAt: subscription.expirationTime ? new Date(subscription.expirationTime) : null
      });
      await repo.save(newSub);
    }
  }

  /**
   * Remove subscription by endpoint for a user
   */
  async removeSubscription(userId: number, endpoint?: string): Promise<void> {
    const repo = AppDataSource.getRepository(PushSubscription);

    if (endpoint) {
      await repo.delete({ userId, endpoint });
    } else {
      // Remove all subscriptions for this user
      await repo.delete({ userId });
    }
  }

  /**
   * Send a push notification to a specific user
   */
  async sendPush(userId: number, payload: PushPayload): Promise<void> {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn('⚠️ VAPID keys not configured - skipping push notification');
      return;
    }

    const repo = AppDataSource.getRepository(PushSubscription);
    const subscriptions = await repo.find({ where: { userId } });

    if (subscriptions.length === 0) {
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      icon: payload.icon || '/iko.png'
    });

    const expiredIds: number[] = [];

    await Promise.allSettled(
      subscriptions.map(async sub => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            pushPayload
          );
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired or unregistered
            expiredIds.push(sub.id);
          } else {
            console.error(`Push error for subscription ${sub.id}:`, err.message);
          }
        }
      })
    );

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await repo.delete(expiredIds);
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds: number[], payload: PushPayload): Promise<void> {
    await Promise.allSettled(userIds.map(id => this.sendPush(id, payload)));
  }

  /**
   * Send push notification to all users with a specific role
   */
  async sendToRole(roleName: string, payload: PushPayload): Promise<void> {
    const userRepo = AppDataSource.getRepository(User);
    const users = await userRepo
      .createQueryBuilder('user')
      .innerJoin('user.role', 'role')
      .where('role.name = :roleName', { roleName })
      .andWhere('user.active = :active', { active: true })
      .select(['user.id'])
      .getMany();

    const userIds = users.map(u => u.id);
    await this.sendToUsers(userIds, payload);
  }

  /**
   * Get subscription status for a user
   */
  async getSubscriptionStatus(userId: number): Promise<{ subscribed: boolean; deviceCount: number }> {
    const repo = AppDataSource.getRepository(PushSubscription);
    const count = await repo.count({ where: { userId } });
    return { subscribed: count > 0, deviceCount: count };
  }
}

export default new WebPushService();

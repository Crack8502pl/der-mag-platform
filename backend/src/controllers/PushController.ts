// src/controllers/PushController.ts
// Web Push notification controller

import { Request, Response } from 'express';
import WebPushService from '../services/WebPushService';

export class PushController {
  /**
   * POST /api/push/subscribe
   * Register a push subscription for the authenticated user
   */
  static async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const { endpoint, keys, expirationTime } = req.body;

      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowe dane subskrypcji. Wymagane: endpoint, keys.p256dh, keys.auth'
        });
        return;
      }

      if (!WebPushService.validateEndpoint(endpoint)) {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowy endpoint push. Dozwolone serwisy: FCM, Mozilla, WNS, Apple'
        });
        return;
      }

      await WebPushService.saveSubscription(userId, { endpoint, keys, expirationTime });

      res.json({ success: true, message: 'Subskrypcja push zapisana' });
    } catch (error: any) {
      console.error('Push subscribe error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Błąd zapisywania subskrypcji push'
      });
    }
  }

  /**
   * POST /api/push/unsubscribe
   * Remove a push subscription for the authenticated user
   */
  static async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const { endpoint } = req.body;

      await WebPushService.removeSubscription(userId, endpoint);

      res.json({ success: true, message: 'Subskrypcja push usunięta' });
    } catch (error: any) {
      console.error('Push unsubscribe error:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd usuwania subskrypcji push'
      });
    }
  }

  /**
   * GET /api/push/vapid-public-key
   * Get the VAPID public key for the client to use
   */
  static async getVapidPublicKey(req: Request, res: Response): Promise<void> {
    const key = process.env.VAPID_PUBLIC_KEY;

    if (!key) {
      res.status(503).json({
        success: false,
        message: 'Web Push nie jest skonfigurowany na serwerze'
      });
      return;
    }

    res.json({ success: true, data: { vapidPublicKey: key } });
  }

  /**
   * GET /api/push/status
   * Check push subscription status for the authenticated user
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const status = await WebPushService.getSubscriptionStatus(userId);
      const vapidConfigured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

      res.json({
        success: true,
        data: {
          ...status,
          vapidConfigured
        }
      });
    } catch (error: any) {
      console.error('Push status error:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania statusu push'
      });
    }
  }
}

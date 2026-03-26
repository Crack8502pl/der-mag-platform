// src/routes/push.routes.ts
// Web Push notification routes

import { Router } from 'express';
import { PushController } from '../controllers/PushController';
import { authenticate } from '../middleware/auth';
import { pushRateLimiter } from '../middleware/pushRateLimiter';

const router = Router();

// GET /api/push/vapid-public-key - Get VAPID public key (no auth required)
router.get('/vapid-public-key', PushController.getVapidPublicKey);

// POST /api/push/subscribe - Register subscription (auth + rate limiter)
router.post('/subscribe', authenticate, pushRateLimiter, PushController.subscribe);

// POST /api/push/unsubscribe - Remove subscription (auth required)
router.post('/unsubscribe', authenticate, PushController.unsubscribe);

// GET /api/push/status - Get subscription status (auth required)
router.get('/status', authenticate, PushController.getStatus);

export default router;

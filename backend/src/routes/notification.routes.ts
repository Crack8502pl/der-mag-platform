// src/routes/notification.routes.ts
// Routing dla powiadomień email

import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Wszystkie endpointy wymagają uwierzytelnienia
router.use(authenticate);

// Test wysyłki emaila
router.post('/test', NotificationController.testEmail);

// Statystyki kolejki
router.get('/queue/stats', NotificationController.getQueueStats);

// Nieudane wysyłki
router.get('/queue/failed', NotificationController.getFailedJobs);

// Ponów nieudane zadanie
router.post('/queue/retry/:jobId', NotificationController.retryFailedJob);

// Wyczyść kolejkę (tylko admin)
router.post('/queue/clear', NotificationController.clearQueue);

// Sprawdź konfigurację
router.get('/config', NotificationController.checkConfig);

export default router;

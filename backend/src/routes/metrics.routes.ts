// src/routes/metrics.routes.ts
import { Router } from 'express';
import { MetricsController } from '../controllers/MetricsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticate, MetricsController.getDashboard);
router.get('/task-types', authenticate, MetricsController.getTaskTypeStats);
router.get('/users/:userId', authenticate, MetricsController.getUserStats);
router.get('/daily', authenticate, MetricsController.getDailyStats);

export default router;

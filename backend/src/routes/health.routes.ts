// src/routes/health.routes.ts
import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';

const router = Router();

router.get('/ping', HealthController.ping);
router.get('/speed-test', HealthController.speedTest);
router.get('/health', HealthController.health);

export default router;

// src/routes/cronConfig.routes.ts
// Routes for CRON schedule management - admin only

import { Router } from 'express';
import { CronConfigController } from '../controllers/CronConfigController';

const router = Router();

// GET /api/admin/cron/schedules — list all jobs
router.get('/schedules', CronConfigController.getAll);

// PUT /api/admin/cron/schedules/:jobId — update schedule
router.put('/schedules/:jobId', CronConfigController.update);

// POST /api/admin/cron/schedules/:jobId/trigger — trigger immediately
router.post('/schedules/:jobId/trigger', CronConfigController.triggerNow);

export default router;

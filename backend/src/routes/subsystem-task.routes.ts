// src/routes/subsystem-task.routes.ts
// Routes for subsystem task endpoints

import { Router } from 'express';
import { SubsystemTaskController } from '../controllers/SubsystemTaskController';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new SubsystemTaskController();

router.post('/:taskId/complete-and-create-asset', authenticate, controller.completeAndCreateAsset);

export default router;

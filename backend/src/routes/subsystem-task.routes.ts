// src/routes/subsystem-task.routes.ts
// Routes for subsystem task endpoints

import { Router } from 'express';
import { SubsystemTaskController } from '../controllers/SubsystemTaskController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/PermissionMiddleware';

const router = Router();
const controller = new SubsystemTaskController();

router.post(
  '/:taskId/complete-and-create-asset',
  authenticate,
  requirePermission('assets', 'create'),
  controller.completeAndCreateAsset
);

export default router;

// src/routes/activity.routes.ts
import { Router } from 'express';
import { ActivityController } from '../controllers/ActivityController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/templates', authenticate, ActivityController.getTemplates);
router.get('/templates/:taskType', authenticate, ActivityController.getTemplates);
router.post('/:id/complete', authenticate, ActivityController.completeActivity);

export default router;

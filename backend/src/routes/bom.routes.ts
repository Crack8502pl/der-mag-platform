// src/routes/bom.routes.ts
import { Router } from 'express';
import { BOMController } from '../controllers/BOMController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/templates', authenticate, BOMController.getTemplates);
router.get('/templates/:taskType', authenticate, BOMController.getTemplates);
router.post('/templates', authenticate, BOMController.createTemplate);

export default router;

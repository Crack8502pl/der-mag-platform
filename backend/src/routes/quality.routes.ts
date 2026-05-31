// src/routes/quality.routes.ts
import { Router } from 'express';
import { QualityController } from '../controllers/QualityController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { uploadSingle } from '../middleware/upload';

const router = Router();

router.post('/photos', authenticate, uploadSingle, QualityController.uploadPhoto);
router.put('/photos/:id/approve', authenticate, checkPermission('photos', 'approve'), QualityController.approvePhoto);

export default router;

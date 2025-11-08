// src/routes/quality.routes.ts
import { Router } from 'express';
import { QualityController } from '../controllers/QualityController';
import { authenticate, authorize } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';

const router = Router();

router.post('/photos', authenticate, uploadSingle, QualityController.uploadPhoto);
router.put('/photos/:id/approve', authenticate, authorize('admin', 'manager'), QualityController.approvePhoto);

export default router;

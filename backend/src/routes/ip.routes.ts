// src/routes/ip.routes.ts
import { Router } from 'express';
import { IPManagementController } from '../controllers/IPManagementController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/pools', authenticate, IPManagementController.getPools);
router.post('/allocate', authenticate, authorize('admin', 'manager'), IPManagementController.allocateIP);
router.post('/release', authenticate, authorize('admin', 'manager'), IPManagementController.releaseIP);

export default router;

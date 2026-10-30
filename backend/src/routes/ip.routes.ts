// src/routes/ip.routes.ts
import { Router } from 'express';
import { IPManagementController } from '../controllers/IPManagementController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';

const router = Router();

router.get('/pools', authenticate, IPManagementController.getPools);
router.post('/allocate', authenticate, checkPermission('network', 'allocate'), IPManagementController.allocateIP);
router.post('/release', authenticate, checkPermission('network', 'allocate'), IPManagementController.releaseIP);

export default router;

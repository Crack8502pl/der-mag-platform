// src/routes/ip.routes.ts
import { Router } from 'express';
import { IPManagementController } from '../controllers/IPManagementController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/pools', authenticate, IPManagementController.getPools);
// TODO: migrate to checkPermission(resource, action)
router.post('/allocate', authenticate, authorize('admin', 'manager'), IPManagementController.allocateIP);
// TODO: migrate to checkPermission(resource, action)
router.post('/release', authenticate, authorize('admin', 'manager'), IPManagementController.releaseIP);

export default router;

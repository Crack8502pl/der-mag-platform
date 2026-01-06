// src/routes/prefabrication.routes.ts
// Routes for prefabrication management

import { Router } from 'express';
import { PrefabricationController } from '../controllers/PrefabricationController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/PermissionMiddleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List prefabrication tasks
router.get(
  '/',
  requirePermission('prefabrication', 'read'),
  PrefabricationController.listTasks
);

// Get prefabrication task details
router.get(
  '/:id',
  requirePermission('prefabrication', 'read'),
  PrefabricationController.getTask
);

// Get devices table for configuration
router.get(
  '/:id/devices',
  requirePermission('prefabrication', 'read'),
  PrefabricationController.getDevicesTable
);

// Configure device
router.post(
  '/:id/configure',
  requirePermission('prefabrication', 'configure'),
  PrefabricationController.configureDevice
);

// Verify device
router.post(
  '/:id/verify',
  requirePermission('prefabrication', 'verify'),
  PrefabricationController.verifyDevice
);

// Complete prefabrication task
router.post(
  '/:id/complete',
  requirePermission('prefabrication', 'complete'),
  PrefabricationController.completeTask
);

// Get device label data
router.get(
  '/:id/label/:deviceId',
  requirePermission('prefabrication', 'read'),
  PrefabricationController.getDeviceLabel
);

export default router;

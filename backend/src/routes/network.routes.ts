// src/routes/network.routes.ts
// Trasy dla zarządzania siecią

import { Router } from 'express';
import { NetworkController } from '../controllers/NetworkController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/PermissionMiddleware';

const router = Router();
const networkController = new NetworkController();

// Network Pools
router.get(
  '/pools',
  authenticate,
  requirePermission('network', 'read'),
  networkController.getPools
);

router.post(
  '/pools',
  authenticate,
  requirePermission('network', 'createPool'),
  networkController.createPool
);

router.put(
  '/pools/:id',
  authenticate,
  requirePermission('network', 'updatePool'),
  networkController.updatePool
);

router.delete(
  '/pools/:id',
  authenticate,
  requirePermission('network', 'deletePool'),
  networkController.deletePool
);

// Network Allocations
router.get(
  '/allocations',
  authenticate,
  requirePermission('network', 'read'),
  networkController.getAllocations
);

// IP Assignments
router.post(
  '/assignments',
  authenticate,
  requirePermission('network', 'allocate'),
  networkController.assignIP
);

router.post(
  '/assignments/:id/configure',
  authenticate,
  requirePermission('prefabrication', 'configure'),
  networkController.configureDevice
);

router.post(
  '/assignments/:id/verify',
  authenticate,
  requirePermission('prefabrication', 'verify'),
  networkController.verifyDevice
);

export default router;

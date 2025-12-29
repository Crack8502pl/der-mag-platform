// src/routes/subsystem.routes.ts
// Trasy dla podsystemów

import { Router } from 'express';
import { SubsystemController } from '../controllers/SubsystemController';
import { NetworkController } from '../controllers/NetworkController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/PermissionMiddleware';

const router = Router();
const subsystemController = new SubsystemController();
const networkController = new NetworkController();

// Podsystemy
router.get(
  '/:id',
  authenticate,
  requirePermission('subsystems', 'read'),
  subsystemController.getSubsystem
);

router.put(
  '/:id',
  authenticate,
  requirePermission('subsystems', 'update'),
  subsystemController.updateSubsystem
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('subsystems', 'delete'),
  subsystemController.deleteSubsystem
);

// Alokacja sieci dla podsystemu
router.post(
  '/:id/allocate-network',
  authenticate,
  requirePermission('subsystems', 'allocateNetwork'),
  networkController.allocateNetwork
);

// Macierz IP dla podsystemu
router.get(
  '/:id/ip-matrix',
  authenticate,
  requirePermission('network', 'viewMatrix'),
  networkController.getIPMatrix
);

export default router;

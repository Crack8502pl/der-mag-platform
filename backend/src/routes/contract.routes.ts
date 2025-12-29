// src/routes/contract.routes.ts
// Trasy dla kontraktów

import { Router } from 'express';
import { ContractController } from '../controllers/ContractController';
import { SubsystemController } from '../controllers/SubsystemController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/PermissionMiddleware';

const router = Router();
const contractController = new ContractController();
const subsystemController = new SubsystemController();

// Kontrakty
router.get(
  '/',
  authenticate,
  requirePermission('contracts', 'read'),
  contractController.getContracts
);

router.get(
  '/:id',
  authenticate,
  requirePermission('contracts', 'read'),
  contractController.getContract
);

router.post(
  '/',
  authenticate,
  requirePermission('contracts', 'create'),
  contractController.createContract
);

router.put(
  '/:id',
  authenticate,
  requirePermission('contracts', 'update'),
  contractController.updateContract
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('contracts', 'delete'),
  contractController.deleteContract
);

router.post(
  '/:id/approve',
  authenticate,
  requirePermission('contracts', 'approve'),
  contractController.approveContract
);

// Podsystemy kontraktu
router.get(
  '/:contractId/subsystems',
  authenticate,
  requirePermission('subsystems', 'read'),
  subsystemController.getContractSubsystems
);

router.post(
  '/:contractId/subsystems',
  authenticate,
  requirePermission('subsystems', 'create'),
  subsystemController.createSubsystem
);

export default router;

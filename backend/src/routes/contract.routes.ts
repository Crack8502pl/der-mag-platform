// src/routes/contract.routes.ts
// Trasy dla kontraktów

import { Router } from 'express';
import { ContractController } from '../controllers/ContractController';
import { SubsystemController } from '../controllers/SubsystemController';
import { AssetController } from '../controllers/AssetController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/PermissionMiddleware';
import networkTopologyController from '../controllers/NetworkTopologyController';

const router = Router();
const contractController = new ContractController();
const subsystemController = new SubsystemController();
const assetController = new AssetController();

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

// Wizard - tworzenie kontraktu z zadaniami (MUST be before generic POST '/')
router.post(
  '/wizard',
  authenticate,
  requirePermission('contracts', 'create'),
  contractController.createContractWithWizard
);

router.post(
  '/topology/export-pdf-wizard',
  authenticate,
  networkTopologyController.exportPdfWizard
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

router.post(
  '/:id/extend',
  authenticate,
  requirePermission('contracts', 'update'),
  (req, res) => contractController.extendContract(req, res)
);

router.post(
  '/import',
  authenticate,
  requirePermission('contracts', 'import'),
  contractController.importContracts
);

router.get(
  '/stats',
  authenticate,
  requirePermission('contracts', 'read'),
  contractController.getStats
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

// Obiekty kontraktu
router.get(
  '/:contractId/assets',
  authenticate,
  requirePermission('contracts', 'read'),
  assetController.getContractAssets
);

// Network Topology routes
// GET    /api/contracts/:contractId/topologies                        → getAllByContract
router.get('/:contractId/topologies', authenticate, networkTopologyController.getAllByContract);

// GET    /api/contracts/:contractId/subsystems/:subsystemIndex/topology/history → getHistory
router.get(
  '/:contractId/subsystems/:subsystemIndex/topology/history',
  authenticate,
  networkTopologyController.getHistory,
);

// GET    /api/contracts/:contractId/subsystems/:subsystemIndex/topology         → getLatest
router.get(
  '/:contractId/subsystems/:subsystemIndex/topology',
  authenticate,
  networkTopologyController.getLatest,
);

// PUT    /api/contracts/:contractId/subsystems/:subsystemIndex/topology         → createNewVersion
router.put(
  '/:contractId/subsystems/:subsystemIndex/topology',
  authenticate,
  networkTopologyController.createNewVersion,
);

router.post(
  '/:contractId/subsystems/:subsystemIndex/topology/export-pdf',
  authenticate,
  networkTopologyController.exportPdf,
);

// DELETE /api/contracts/:contractId/subsystems/:subsystemIndex/topology         → delete
router.delete(
  '/:contractId/subsystems/:subsystemIndex/topology',
  authenticate,
  networkTopologyController.delete,
);

export default router;

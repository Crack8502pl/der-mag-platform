// src/routes/workflow-bom.routes.ts
// Routes for workflow BOM management

import { Router } from 'express';
import { WorkflowBomController } from '../controllers/WorkflowBomController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/PermissionMiddleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Import BOM template from CSV
router.post(
  '/import-csv',
  requirePermission('workflow', 'create'),
  WorkflowBomController.importCsv
);

// Generate BOM for subsystem
router.post(
  '/generate/:subsystemId',
  requirePermission('workflow', 'create'),
  WorkflowBomController.generateBom
);

// Get network devices from BOM
router.get(
  '/network-devices/:bomId',
  requirePermission('workflow', 'read'),
  WorkflowBomController.getNetworkDevices
);

// List all BOM templates
router.get(
  '/templates',
  requirePermission('workflow', 'read'),
  WorkflowBomController.listTemplates
);

// Get BOM template by code
router.get(
  '/templates/:templateCode',
  requirePermission('workflow', 'read'),
  WorkflowBomController.getTemplate
);

export default router;

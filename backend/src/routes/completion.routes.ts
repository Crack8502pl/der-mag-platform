// src/routes/completion.routes.ts
// Routes for completion/scanner functionality

import { Router } from 'express';
import { CompletionController } from '../controllers/CompletionController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/PermissionMiddleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create new completion order
router.post(
  '/',
  requirePermission('completion', 'create'),
  CompletionController.createOrder
);

// List all completion orders
router.get(
  '/orders',
  requirePermission('completion', 'read'),
  CompletionController.listOrders
);

// Get single completion order
router.get(
  '/orders/:id',
  requirePermission('completion', 'read'),
  CompletionController.getOrder
);

// Scan item
router.post(
  '/orders/:id/scan',
  requirePermission('completion', 'scan'),
  CompletionController.scanItem
);

// Report missing item
router.post(
  '/orders/:id/report-missing',
  requirePermission('completion', 'reportMissing'),
  CompletionController.reportMissing
);

// Create pallet
router.post(
  '/orders/:id/pallets',
  requirePermission('completion', 'create'),
  CompletionController.createPallet
);

// Assign items to pallet
router.post(
  '/orders/:id/assign-pallet',
  requirePermission('completion', 'assignPallet'),
  CompletionController.assignPallet
);

// Make decision on partial completion
router.patch(
  '/orders/:id/decision',
  requirePermission('completion', 'decideContinue'),
  CompletionController.makeDecision
);

// Approve completion (full or partial)
router.post(
  '/orders/:id/approve',
  requirePermission('completion', 'complete'),
  CompletionController.approveCompletion
);

// Complete order (legacy endpoint)
router.post(
  '/orders/:id/complete',
  requirePermission('completion', 'complete'),
  CompletionController.completeOrder
);

// Create prefabrication task after completion
router.post(
  '/orders/:id/create-prefab',
  requirePermission('completion', 'complete'),
  CompletionController.createPrefabTask
);

export default router;

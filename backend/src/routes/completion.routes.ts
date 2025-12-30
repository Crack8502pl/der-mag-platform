// src/routes/completion.routes.ts
// Routes for completion/scanner functionality

import { Router } from 'express';
import { CompletionController } from '../controllers/CompletionController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/PermissionMiddleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List all completion orders
router.get(
  '/orders',
  checkPermission('completion', 'read'),
  CompletionController.listOrders
);

// Get single completion order
router.get(
  '/orders/:id',
  checkPermission('completion', 'read'),
  CompletionController.getOrder
);

// Scan item
router.post(
  '/orders/:id/scan',
  checkPermission('completion', 'scan'),
  CompletionController.scanItem
);

// Report missing item
router.post(
  '/orders/:id/report-missing',
  checkPermission('completion', 'reportMissing'),
  CompletionController.reportMissing
);

// Assign items to pallet
router.post(
  '/orders/:id/assign-pallet',
  checkPermission('completion', 'assignPallet'),
  CompletionController.assignPallet
);

// Make decision on partial completion
router.patch(
  '/orders/:id/decision',
  checkPermission('completion', 'decideContinue'),
  CompletionController.makeDecision
);

// Complete order
router.post(
  '/orders/:id/complete',
  checkPermission('completion', 'complete'),
  CompletionController.completeOrder
);

export default router;

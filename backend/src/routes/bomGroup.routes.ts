// src/routes/bomGroup.routes.ts
// Routes for BOM material groups

import { Router } from 'express';
import { BomGroupController } from '../controllers/BomGroupController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all groups (with optional filter for inactive)
// Query params: includeInactive
router.get(
  '/',
  BomGroupController.getAllGroups
);

// Get specific group by ID
router.get(
  '/:id',
  BomGroupController.getGroupById
);

// Create new group (requires admin, manager, or bom_editor role)
router.post(
  '/',
  checkPermission('bom', 'create'),
  BomGroupController.createGroup
);

// Update group (requires admin, manager, or bom_editor role)
router.put(
  '/:id',
  checkPermission('bom', 'update'),
  BomGroupController.updateGroup
);

// Delete group (requires admin, manager, or bom_editor role)
router.delete(
  '/:id',
  checkPermission('bom', 'delete'),
  BomGroupController.deleteGroup
);

export default router;

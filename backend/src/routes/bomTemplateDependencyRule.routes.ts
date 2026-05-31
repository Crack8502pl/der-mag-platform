// src/routes/bomTemplateDependencyRule.routes.ts
// Routes for BOM template dependency rules

import { Router } from 'express';
import { BomTemplateDependencyRuleController } from '../controllers/BomTemplateDependencyRuleController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';

const router = Router();

// All routes require authentication and specific permissions
router.use(authenticate);

// List rules for a template
router.get(
  '/template/:templateId',
  checkPermission('bom', 'read'),
  BomTemplateDependencyRuleController.getRulesForTemplate
);

// Get single rule
router.get(
  '/:id',
  checkPermission('bom', 'read'),
  BomTemplateDependencyRuleController.getRule
);

// Create rule
router.post(
  '/',
  checkPermission('bom', 'create'),
  BomTemplateDependencyRuleController.createRule
);

// Update rule
router.put(
  '/:id',
  checkPermission('bom', 'update'),
  BomTemplateDependencyRuleController.updateRule
);

// Delete rule
router.delete(
  '/:id',
  checkPermission('bom', 'delete'),
  BomTemplateDependencyRuleController.deleteRule
);

export default router;

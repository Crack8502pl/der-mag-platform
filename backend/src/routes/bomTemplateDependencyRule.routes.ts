// src/routes/bomTemplateDependencyRule.routes.ts
// Routes for BOM template dependency rules

import { Router } from 'express';
import { BomTemplateDependencyRuleController } from '../controllers/BomTemplateDependencyRuleController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// All routes require authentication and specific permissions
router.use(authenticate);

// List rules for a template
router.get(
  '/template/:templateId',
  authorize('admin', 'manager', 'bom_editor'),
  BomTemplateDependencyRuleController.getRulesForTemplate
);

// Get single rule
router.get(
  '/:id',
  authorize('admin', 'manager', 'bom_editor'),
  BomTemplateDependencyRuleController.getRule
);

// Create rule
router.post(
  '/',
  authorize('admin', 'manager', 'bom_editor'),
  BomTemplateDependencyRuleController.createRule
);

// Update rule
router.put(
  '/:id',
  authorize('admin', 'manager', 'bom_editor'),
  BomTemplateDependencyRuleController.updateRule
);

// Delete rule
router.delete(
  '/:id',
  authorize('admin', 'manager', 'bom_editor'),
  BomTemplateDependencyRuleController.deleteRule
);

export default router;

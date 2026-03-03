// src/routes/bomSubsystemTemplate.routes.ts
// Routes for BOM subsystem templates

import { Router } from 'express';
import { BomSubsystemTemplateController } from '../controllers/BomSubsystemTemplateController';
import { authenticate, authorize } from '../middleware/auth';
import { uploadCSV } from '../middleware/upload';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all templates (with optional filters)
// Query params: subsystemType, taskVariant, isActive
router.get(
  '/',
  BomSubsystemTemplateController.getAllTemplates
);

// Get template for specific subsystem type and variant
router.get(
  '/for/:subsystemType/:taskVariant?',
  BomSubsystemTemplateController.getTemplateFor
);

// Get empty CSV template (must be before /:id)
router.get(
  '/csv-template',
  BomSubsystemTemplateController.getCsvTemplate
);

// Import template from CSV (must be before /:id)
router.post(
  '/import',
  authorize('admin', 'manager'),
  uploadCSV.single('file'),
  BomSubsystemTemplateController.importTemplate
);

// Get specific template by ID
router.get(
  '/:id',
  BomSubsystemTemplateController.getTemplateById
);

// Export template to CSV
router.get(
  '/:id/export',
  authorize('admin', 'manager', 'bom_editor'),
  BomSubsystemTemplateController.exportTemplate
);

// Create new template (requires admin or manager role)
router.post(
  '/',
  authorize('admin', 'manager', 'bom_editor'),
  BomSubsystemTemplateController.createTemplate
);

// Update template (requires admin, manager, or bom_editor role)
router.put(
  '/:id',
  authorize('admin', 'manager', 'bom_editor'),
  BomSubsystemTemplateController.updateTemplate
);

// Delete template (requires admin, manager, or bom_editor role)
router.delete(
  '/:id',
  authorize('admin', 'manager', 'bom_editor'),
  BomSubsystemTemplateController.deleteTemplate
);

// Apply template to task (requires admin, manager, or bom_editor role)
router.post(
  '/:id/apply/:taskId',
  authorize('admin', 'manager', 'bom_editor'),
  BomSubsystemTemplateController.applyTemplateToTask
);

export default router;

// src/routes/bomSubsystemTemplate.routes.ts
// Routes for BOM subsystem templates

import { Router } from 'express';
import { BomSubsystemTemplateController } from '../controllers/BomSubsystemTemplateController';
import { authenticate, authorize } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { uploadCSV } from '../middleware/upload';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

router.get(
  '/export-all-json',
  // TODO: migrate to checkPermission(resource, action)
  authorize('admin'),
  BomSubsystemTemplateController.exportAllJson
);

router.post(
  '/import-all-json',
  // TODO: migrate to checkPermission(resource, action)
  authorize('admin'),
  upload.single('file'),
  BomSubsystemTemplateController.importAllJson
);

// Import template from CSV (must be before /:id)
router.post(
  '/import',
  checkPermission('bom', 'create'),
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
  checkPermission('bom', 'read'),
  BomSubsystemTemplateController.exportTemplate
);

// Create new template (requires admin or manager role)
router.post(
  '/',
  checkPermission('bom', 'create'),
  BomSubsystemTemplateController.createTemplate
);

// Update template (requires admin, manager, or bom_editor role)
router.put(
  '/:id',
  checkPermission('bom', 'update'),
  BomSubsystemTemplateController.updateTemplate
);

// Delete template (requires admin, manager, or bom_editor role)
router.delete(
  '/:id',
  checkPermission('bom', 'delete'),
  BomSubsystemTemplateController.deleteTemplate
);

// Apply template to task (requires admin, manager, or bom_editor role)
router.post(
  '/:id/apply/:taskId',
  checkPermission('bom', 'update'),
  BomSubsystemTemplateController.applyTemplateToTask
);

export default router;

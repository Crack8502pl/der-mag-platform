// src/routes/bom-templates.routes.ts
// Routes for BOM Templates and Dependency Rules

import { Router } from 'express';
import { BOMTemplateController } from '../controllers/BOMTemplateController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: '/tmp/uploads/' });

// All routes require authentication
router.use(authenticate);

// ==== BOM TEMPLATES ====

// Get list of templates with pagination and filters
router.get('/templates', BOMTemplateController.getTemplates);

// Get unique categories
router.get('/templates/categories', BOMTemplateController.getCategories);

// Get CSV template
router.get('/templates/csv-template', BOMTemplateController.getCsvTemplate);

// Get template details
router.get('/templates/:id', BOMTemplateController.getTemplate);

// Create template (requires bom:create permission)
router.post('/templates', checkPermission('bom', 'create'), BOMTemplateController.createTemplate);

// Update template (requires bom:update permission)
router.put('/templates/:id', checkPermission('bom', 'update'), BOMTemplateController.updateTemplate);

// Soft delete template (requires bom:delete permission)
router.delete('/templates/:id', checkPermission('bom', 'delete'), BOMTemplateController.deleteTemplate);

// Import CSV (requires bom:create permission)
router.post('/templates/import-csv', checkPermission('bom', 'create'), upload.single('file'), BOMTemplateController.importCsv);

// Copy template to another category (requires bom:create permission)
router.post('/templates/:id/copy/:targetCategoryId', checkPermission('bom', 'create'), BOMTemplateController.copyTemplate);

// ==== DEPENDENCY RULES ====

// Get list of dependency rules
router.get('/dependencies', BOMTemplateController.getDependencies);

// Get dependency rule details
router.get('/dependencies/:id', BOMTemplateController.getDependency);

// Create dependency rule (requires bom:create permission)
router.post('/dependencies', checkPermission('bom', 'create'), BOMTemplateController.createDependency);

// Update dependency rule (requires bom:update permission)
router.put('/dependencies/:id', checkPermission('bom', 'update'), BOMTemplateController.updateDependency);

// Delete dependency rule (requires bom:delete permission)
router.delete('/dependencies/:id', checkPermission('bom', 'delete'), BOMTemplateController.deleteDependency);

// Validate BOM against rules
router.post('/dependencies/validate', BOMTemplateController.validateBom);

export default router;

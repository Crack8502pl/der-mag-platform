// src/routes/symfoniaIntegration.routes.ts
// Routes for Symfonia MSSQL integration - admin only

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { SymfoniaIntegrationController } from '../controllers/SymfoniaIntegrationController';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(checkPermission('admin', 'access'));

router.get('/status', SymfoniaIntegrationController.getStatus);
router.get('/tables', SymfoniaIntegrationController.getTables);
router.get('/tables/:tableName/data', SymfoniaIntegrationController.getTableData);
router.get('/tables/:tableName/data-paginated', SymfoniaIntegrationController.getTableDataPaginated);
router.get('/tables/:tableName/search', SymfoniaIntegrationController.searchInTable);
router.post('/tables/:tableName/batch-search', SymfoniaIntegrationController.batchSearch);
router.get('/tables/:tableName', SymfoniaIntegrationController.getTableStructure);
router.get('/foreign-keys', SymfoniaIntegrationController.getForeignKeys);
router.get('/views', SymfoniaIntegrationController.getViews);
router.get('/export', SymfoniaIntegrationController.exportSchema);
router.get('/global-search', SymfoniaIntegrationController.globalSearch);
router.post('/batch-global-search', SymfoniaIntegrationController.batchGlobalSearch);

export default router;

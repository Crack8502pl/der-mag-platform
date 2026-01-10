// src/routes/warehouseStock.routes.ts
// Routes dla warehouse stock

import { Router } from 'express';
import { WarehouseStockController } from '../controllers/WarehouseStockController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/PermissionMiddleware';
import multer from 'multer';

const router = Router();
const controller = new WarehouseStockController();

// Konfiguracja multer dla uploadu CSV
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// GET /api/warehouse-stock - lista materiałów
router.get('/', authenticate, requirePermission('warehouse_stock', 'read'), controller.getAll);

// GET /api/warehouse-stock/categories - lista kategorii
router.get('/categories', authenticate, requirePermission('warehouse_stock', 'read'), controller.getCategories);

// GET /api/warehouse-stock/suppliers - lista dostawców
router.get('/suppliers', authenticate, requirePermission('warehouse_stock', 'read'), controller.getSuppliers);

// GET /api/warehouse-stock/template - pobierz szablon CSV
router.get('/template', authenticate, requirePermission('warehouse_stock', 'read'), controller.getTemplate);

// GET /api/warehouse-stock/export - export do Excel
router.get('/export', authenticate, requirePermission('warehouse_stock', 'export'), controller.export);

// POST /api/warehouse-stock/import/analyze - analiza CSV przed importem
router.post('/import/analyze', authenticate, requirePermission('warehouse_stock', 'import'), controller.analyzeImport);

// POST /api/warehouse-stock/import - import z CSV
router.post('/import', authenticate, requirePermission('warehouse_stock', 'import'), upload.single('file'), controller.import);

// POST /api/warehouse-stock/subsystem/:subsystemId/auto-assign
router.post('/subsystem/:subsystemId/auto-assign', authenticate, requirePermission('warehouse_stock', 'auto_assign'), controller.autoAssignToSubsystem);

// POST /api/warehouse-stock/task/:taskId/auto-assign
router.post('/task/:taskId/auto-assign', authenticate, requirePermission('warehouse_stock', 'auto_assign'), controller.autoAssignToTask);

// GET /api/warehouse-stock/:id - szczegóły materiału
router.get('/:id', authenticate, requirePermission('warehouse_stock', 'read'), controller.getById);

// GET /api/warehouse-stock/:id/history - historia operacji
router.get('/:id/history', authenticate, requirePermission('warehouse_stock', 'view_history'), controller.getHistory);

// POST /api/warehouse-stock - utwórz materiał
router.post('/', authenticate, requirePermission('warehouse_stock', 'create'), controller.create);

// PUT /api/warehouse-stock/:id - aktualizuj materiał
router.put('/:id', authenticate, requirePermission('warehouse_stock', 'update'), controller.update);

// DELETE /api/warehouse-stock/:id - usuń materiał
router.delete('/:id', authenticate, requirePermission('warehouse_stock', 'delete'), controller.delete);

// POST /api/warehouse-stock/:id/reserve - rezerwuj materiał
router.post('/:id/reserve', authenticate, requirePermission('warehouse_stock', 'reserve_stock'), controller.reserve);

// POST /api/warehouse-stock/:id/release - zwolnij rezerwację
router.post('/:id/release', authenticate, requirePermission('warehouse_stock', 'release_stock'), controller.release);

// POST /api/warehouse-stock/:id/map-bom - mapuj do BOM template
router.post('/:id/map-bom', authenticate, requirePermission('warehouse_stock', 'create'), controller.mapToBom);

// POST /api/warehouse-stock/:id/map-workflow-bom - mapuj do workflow BOM item
router.post('/:id/map-workflow-bom', authenticate, requirePermission('warehouse_stock', 'create'), controller.mapToWorkflowBom);

export default router;

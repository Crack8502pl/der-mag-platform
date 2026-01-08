// src/routes/warehouseStock.routes.ts
// Routes dla warehouse stock

import { Router } from 'express';
import { WarehouseStockController } from '../controllers/WarehouseStockController';
import { authenticate } from '../middleware/auth';
import multer from 'multer';

const router = Router();
const controller = new WarehouseStockController();

// Konfiguracja multer dla uploadu CSV
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middleware authorize - uproszczona wersja sprawdzająca uprawnienia
const authorize = (action: string) => {
  return (req: any, res: any, next: any) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Brak autoryzacji' });
    }

    // Admin ma pełny dostęp
    if (user.role === 'admin' || user.permissions?.all) {
      return next();
    }

    // Sprawdź uprawnienia do warehouse_stock
    const warehouseStockPerms = user.permissions?.warehouse_stock;
    if (!warehouseStockPerms) {
      return res.status(403).json({ success: false, message: 'Brak uprawnień do modułu magazynowego' });
    }

    // Sprawdź konkretne uprawnienie
    if (!warehouseStockPerms[action]) {
      return res.status(403).json({ success: false, message: `Brak uprawnień do akcji: ${action}` });
    }

    next();
  };
};

// GET /api/warehouse-stock - lista materiałów
router.get('/', authenticate, authorize('read'), controller.getAll);

// GET /api/warehouse-stock/categories - lista kategorii
router.get('/categories', authenticate, authorize('read'), controller.getCategories);

// GET /api/warehouse-stock/suppliers - lista dostawców
router.get('/suppliers', authenticate, authorize('read'), controller.getSuppliers);

// GET /api/warehouse-stock/template - pobierz szablon CSV
router.get('/template', authenticate, authorize('read'), controller.getTemplate);

// GET /api/warehouse-stock/export - export do Excel
router.get('/export', authenticate, authorize('export'), controller.export);

// POST /api/warehouse-stock/import - import z CSV
router.post('/import', authenticate, authorize('import'), upload.single('file'), controller.import);

// POST /api/warehouse-stock/subsystem/:subsystemId/auto-assign
router.post('/subsystem/:subsystemId/auto-assign', authenticate, authorize('auto_assign'), controller.autoAssignToSubsystem);

// POST /api/warehouse-stock/task/:taskId/auto-assign
router.post('/task/:taskId/auto-assign', authenticate, authorize('auto_assign'), controller.autoAssignToTask);

// GET /api/warehouse-stock/:id - szczegóły materiału
router.get('/:id', authenticate, authorize('read'), controller.getById);

// GET /api/warehouse-stock/:id/history - historia operacji
router.get('/:id/history', authenticate, authorize('view_history'), controller.getHistory);

// POST /api/warehouse-stock - utwórz materiał
router.post('/', authenticate, authorize('create'), controller.create);

// PUT /api/warehouse-stock/:id - aktualizuj materiał
router.put('/:id', authenticate, authorize('update'), controller.update);

// DELETE /api/warehouse-stock/:id - usuń materiał
router.delete('/:id', authenticate, authorize('delete'), controller.delete);

// POST /api/warehouse-stock/:id/reserve - rezerwuj materiał
router.post('/:id/reserve', authenticate, authorize('reserve_stock'), controller.reserve);

// POST /api/warehouse-stock/:id/release - zwolnij rezerwację
router.post('/:id/release', authenticate, authorize('release_stock'), controller.release);

// POST /api/warehouse-stock/:id/map-bom - mapuj do BOM template
router.post('/:id/map-bom', authenticate, authorize('create'), controller.mapToBom);

// POST /api/warehouse-stock/:id/map-workflow-bom - mapuj do workflow BOM item
router.post('/:id/map-workflow-bom', authenticate, authorize('create'), controller.mapToWorkflowBom);

export default router;

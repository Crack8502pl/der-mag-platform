// src/routes/bom-builder.routes.ts
// Routing dla BOM Builder i szablonów dokumentów

import { Router } from 'express';
import { BOMBuilderController } from '../controllers/BOMBuilderController';
import { authenticate, authorize } from '../middleware/auth';
import { uploadTemplate } from '../middleware/upload';

const router = Router();

// Wszystkie trasy wymagają autoryzacji
router.use(authenticate);

// === MATERIAŁY (BOM) ===

// Lista wszystkich materiałów (katalog)
router.get('/materials', BOMBuilderController.getMaterials);

// Lista kategorii materiałów
router.get('/categories', BOMBuilderController.getCategories);

// Szablon BOM dla typu zadania
router.get('/task-type/:taskTypeId', BOMBuilderController.getTaskTypeBOM);

// Utwórz szablon BOM dla typu zadania (batch) - wymaga uprawnień
router.post(
  '/task-type/:taskTypeId',
  authorize('admin', 'manager'),
  BOMBuilderController.createTaskTypeBOM
);

// Aktualizuj szablon BOM (batch update) - wymaga uprawnień
router.put(
  '/task-type/:taskTypeId',
  authorize('admin', 'manager'),
  BOMBuilderController.updateTaskTypeBOM
);

// Kopiuj szablon BOM do innego typu zadania - wymaga uprawnień
router.post(
  '/task-type/:sourceId/copy/:targetId',
  authorize('admin', 'manager'),
  BOMBuilderController.copyBOMTemplate
);

// Dodaj pojedynczy materiał - wymaga uprawnień
router.post(
  '/items',
  authorize('admin', 'manager'),
  BOMBuilderController.createItem
);

// Edytuj materiał - wymaga uprawnień
router.put(
  '/items/:id',
  authorize('admin', 'manager'),
  BOMBuilderController.updateItem
);

// Usuń materiał - wymaga uprawnień
router.delete(
  '/items/:id',
  authorize('admin', 'manager'),
  BOMBuilderController.deleteItem
);

// === SZABLONY DOKUMENTÓW ===

// Lista szablonów dokumentów
router.get('/templates', BOMBuilderController.getTemplates);

// Upload szablonu dokumentu - wymaga uprawnień
router.post(
  '/templates',
  authorize('admin', 'manager'),
  uploadTemplate.single('file'),
  BOMBuilderController.uploadTemplate
);

// Szczegóły szablonu
router.get('/templates/:id', BOMBuilderController.getTemplate);

// Generuj dokument z szablonu
router.post(
  '/templates/:id/generate',
  BOMBuilderController.generateDocument
);

// Usuń szablon - wymaga uprawnień
router.delete(
  '/templates/:id',
  authorize('admin', 'manager'),
  BOMBuilderController.deleteTemplate
);

export default router;

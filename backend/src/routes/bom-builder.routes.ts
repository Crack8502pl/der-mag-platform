// src/routes/bom-builder.routes.ts
// Routing dla BOM Builder i szablonów dokumentów

import { Router } from 'express';
import { BOMBuilderController } from '../controllers/BOMBuilderController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
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
  checkPermission('bom', 'create'),
  BOMBuilderController.createTaskTypeBOM
);

// Aktualizuj szablon BOM (batch update) - wymaga uprawnień
router.put(
  '/task-type/:taskTypeId',
  checkPermission('bom', 'update'),
  BOMBuilderController.updateTaskTypeBOM
);

// Kopiuj szablon BOM do innego typu zadania - wymaga uprawnień
router.post(
  '/task-type/:sourceId/copy/:targetId',
  checkPermission('bom', 'create'),
  BOMBuilderController.copyBOMTemplate
);

// Dodaj pojedynczy materiał - wymaga uprawnień
router.post(
  '/items',
  checkPermission('bom', 'create'),
  BOMBuilderController.createItem
);

// Edytuj materiał - wymaga uprawnień
router.put(
  '/items/:id',
  checkPermission('bom', 'update'),
  BOMBuilderController.updateItem
);

// Usuń materiał - wymaga uprawnień
router.delete(
  '/items/:id',
  checkPermission('bom', 'delete'),
  BOMBuilderController.deleteItem
);

// === SZABLONY DOKUMENTÓW ===

// Lista szablonów dokumentów
router.get('/templates', BOMBuilderController.getTemplates);

// Upload szablonu dokumentu - wymaga uprawnień
router.post(
  '/templates',
  checkPermission('documents', 'create'),
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
  checkPermission('documents', 'delete'),
  BOMBuilderController.deleteTemplate
);

export default router;

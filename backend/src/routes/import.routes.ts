// src/routes/import.routes.ts
// Routing dla importu materiałów z CSV

import { Router } from 'express';
import { ImportController } from '../controllers/ImportController';
import { authenticate, authorize } from '../middleware/auth';
import { uploadCSV } from '../middleware/upload';

const router = Router();

// Wszystkie trasy wymagają autoryzacji
router.use(authenticate);

// Pobierz wzorcowy plik CSV (dostępne dla wszystkich)
router.get('/materials/template', ImportController.downloadTemplate);

// Upload pliku CSV i generowanie preview (wymaga uprawnień admin lub manager)
router.post(
  '/materials/csv',
  authorize('admin', 'manager'),
  uploadCSV.single('file'),
  ImportController.uploadCSV
);

// Pobierz preview importu
router.get('/materials/:uuid/preview', ImportController.getPreview);

// Potwierdź import (wymaga uprawnień admin lub manager)
router.post(
  '/materials/:uuid/confirm',
  authorize('admin', 'manager'),
  ImportController.confirmImport
);

// Anuluj import (wymaga uprawnień admin lub manager)
router.delete(
  '/materials/:uuid',
  authorize('admin', 'manager'),
  ImportController.cancelImport
);

// Historia importów
router.get('/history', ImportController.getHistory);

export default router;

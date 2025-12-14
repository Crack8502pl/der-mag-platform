// src/routes/document.routes.ts
// Routing dla zarządzania dokumentami

import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';
import { authenticate, authorize } from '../middleware/auth';
import { uploadDocument } from '../middleware/upload';

const router = Router();

// Wszystkie trasy wymagają autoryzacji
router.use(authenticate);

// Upload dokumentu
router.post(
  '/upload',
  uploadDocument.single('file'),
  DocumentController.uploadDocument
);

// Lista dokumentów (z filtrowaniem)
router.get('/', DocumentController.getDocuments);

// Dokumenty dla zadania
router.get('/task/:taskId', DocumentController.getTaskDocuments);

// Szczegóły dokumentu
router.get('/:id', DocumentController.getDocument);

// Pobierz plik dokumentu
router.get('/:id/download', DocumentController.downloadDocument);

// Aktualizuj dokument
router.put('/:id', DocumentController.updateDocument);

// Usuń dokument (wymaga uprawnień admin lub manager)
router.delete(
  '/:id',
  authorize('admin', 'manager'),
  DocumentController.deleteDocument
);

export default router;

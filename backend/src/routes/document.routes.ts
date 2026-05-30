// src/routes/document.routes.ts
// Routing dla zarządzania dokumentami

import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { uploadDocument, uploadTemplate } from '../middleware/upload';
import { BOMBuilderController } from '../controllers/BOMBuilderController';

const router = Router();

// Wszystkie trasy wymagają autoryzacji
router.use(authenticate);

// Upload dokumentu
router.post(
  '/upload',
  uploadDocument.single('file'),
  DocumentController.uploadDocument
);

// Template endpoints and generator aliases for frontend module compatibility
router.get('/templates/list', BOMBuilderController.getTemplates);
router.post('/templates/upload', uploadTemplate.single('file'), BOMBuilderController.uploadTemplate);
router.post('/generate/:templateId', (req, _res, next) => {
  req.params.id = req.params.templateId;
  next();
}, BOMBuilderController.generateDocument);

// Lista dokumentów (z filtrowaniem)
router.get('/', DocumentController.getDocuments);

// Dokumenty dla zadania
router.get('/task/:taskId', DocumentController.getTaskDocuments);

// Pobierz plik dokumentu
router.get('/:id/download', DocumentController.downloadDocument);

// Szczegóły dokumentu
router.get('/:id', DocumentController.getDocument);

// Aktualizuj dokument
router.put('/:id', DocumentController.updateDocument);

// Usuń dokument (wymaga uprawnienia documents.delete)
router.delete(
  '/:id',
  checkPermission('documents', 'delete'),
  DocumentController.deleteDocument
);

export default router;

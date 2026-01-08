// src/routes/subsystem.routes.ts
// Trasy dla podsystemów

import { Router } from 'express';
import { SubsystemController } from '../controllers/SubsystemController';
import { NetworkController } from '../controllers/NetworkController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/PermissionMiddleware';
import { uploadSubsystemDocument } from '../middleware/fileUpload';

const router = Router();
const subsystemController = new SubsystemController();
const networkController = new NetworkController();

// Lista podsystemów z filtrami
router.get(
  '/',
  authenticate,
  requirePermission('subsystems', 'read'),
  subsystemController.getList
);

// Szczegóły podsystemu
router.get(
  '/:id',
  authenticate,
  requirePermission('subsystems', 'read'),
  subsystemController.getSubsystem
);

// Lista zadań dla podsystemu
router.get(
  '/:id/tasks',
  authenticate,
  requirePermission('subsystems', 'read'),
  subsystemController.getTasks
);

// Dodanie zadań do podsystemu
router.post(
  '/:id/tasks',
  authenticate,
  requirePermission('subsystems', 'create'),
  subsystemController.createTasks
);

// Aktualizacja podsystemu
router.put(
  '/:id',
  authenticate,
  requirePermission('subsystems', 'update'),
  subsystemController.updateSubsystem
);

// Usunięcie podsystemu
router.delete(
  '/:id',
  authenticate,
  requirePermission('subsystems', 'delete'),
  subsystemController.deleteSubsystem
);

// Dokumentacja podsystemu - lista
router.get(
  '/:id/documentation',
  authenticate,
  requirePermission('subsystems', 'read'),
  subsystemController.getDocumentation
);

// Dokumentacja podsystemu - upload
router.post(
  '/:id/documentation',
  authenticate,
  requirePermission('subsystems', 'uploadDocs'),
  uploadSubsystemDocument.single('file'),
  subsystemController.uploadDocument
);

// Dokumentacja podsystemu - pobieranie
router.get(
  '/:id/documentation/:docId/download',
  authenticate,
  requirePermission('subsystems', 'read'),
  subsystemController.downloadDocument
);

// Dokumentacja podsystemu - usuwanie
router.delete(
  '/:id/documentation/:docId',
  authenticate,
  requirePermission('subsystems', 'deleteDocs'),
  subsystemController.deleteDocument
);

// Alokacja sieci dla podsystemu
router.post(
  '/:id/allocate-network',
  authenticate,
  requirePermission('subsystems', 'allocateNetwork'),
  networkController.allocateNetwork
);

// Macierz IP dla podsystemu
router.get(
  '/:id/ip-matrix',
  authenticate,
  requirePermission('network', 'viewMatrix'),
  networkController.getIPMatrix
);

export default router;

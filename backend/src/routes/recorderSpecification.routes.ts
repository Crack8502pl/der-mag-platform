// src/routes/recorderSpecification.routes.ts
// Routes for recorder specifications (NVR/DVR models)

import { Router } from 'express';
import { RecorderSpecificationController } from '../controllers/RecorderSpecificationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/recorder-specifications/select/:cameraCount — must come before /:id
router.get(
  '/select/:cameraCount',
  authorize('admin', 'manager', 'bom_editor'),
  RecorderSpecificationController.selectForCameras
);

// GET /api/recorder-specifications
router.get('/', authorize('admin', 'manager', 'bom_editor'), RecorderSpecificationController.getAll);

// GET /api/recorder-specifications/:id
router.get('/:id', authorize('admin', 'manager', 'bom_editor'), RecorderSpecificationController.getById);

// POST /api/recorder-specifications
router.post('/', authorize('admin', 'manager', 'bom_editor'), RecorderSpecificationController.create);

// PUT /api/recorder-specifications/:id
router.put('/:id', authorize('admin', 'manager', 'bom_editor'), RecorderSpecificationController.update);

// DELETE /api/recorder-specifications/:id
router.delete('/:id', authorize('admin'), RecorderSpecificationController.delete);

export default router;

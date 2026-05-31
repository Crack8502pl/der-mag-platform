// src/routes/recorderSpecification.routes.ts
// Routes for recorder specifications (NVR/DVR models)

import { Router } from 'express';
import { RecorderSpecificationController } from '../controllers/RecorderSpecificationController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';

const router = Router();

router.use(authenticate);

// GET /api/recorder-specifications/select/:cameraCount — must come before /:id
router.get(
  '/select/:cameraCount',
  checkPermission('bom', 'read'),
  RecorderSpecificationController.selectForCameras
);

// GET /api/recorder-specifications
router.get('/', checkPermission('bom', 'read'), RecorderSpecificationController.getAll);

// GET /api/recorder-specifications/:id
router.get('/:id', checkPermission('bom', 'read'), RecorderSpecificationController.getById);

// POST /api/recorder-specifications
router.post('/', checkPermission('bom', 'create'), RecorderSpecificationController.create);

// PUT /api/recorder-specifications/:id
router.put('/:id', checkPermission('bom', 'update'), RecorderSpecificationController.update);

// DELETE /api/recorder-specifications/:id
router.delete('/:id', checkPermission('bom', 'delete'), RecorderSpecificationController.delete);

export default router;

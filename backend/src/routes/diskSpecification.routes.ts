// src/routes/diskSpecification.routes.ts
// Routes for disk specifications

import { Router } from 'express';
import { DiskSpecificationController } from '../controllers/DiskSpecificationController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';

const router = Router();

router.use(authenticate);

// POST /api/disk-specifications/calculate — must come before /:id
router.post(
  '/calculate',
  checkPermission('bom', 'read'),
  DiskSpecificationController.calculate
);

// GET /api/disk-specifications
router.get('/', checkPermission('bom', 'read'), DiskSpecificationController.getAll);

// GET /api/disk-specifications/:id
router.get('/:id', checkPermission('bom', 'read'), DiskSpecificationController.getById);

// POST /api/disk-specifications
router.post('/', checkPermission('bom', 'create'), DiskSpecificationController.create);

// PUT /api/disk-specifications/:id
router.put('/:id', checkPermission('bom', 'update'), DiskSpecificationController.update);

// DELETE /api/disk-specifications/:id
router.delete('/:id', checkPermission('bom', 'delete'), DiskSpecificationController.delete);

export default router;

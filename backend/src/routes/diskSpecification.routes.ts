// src/routes/diskSpecification.routes.ts
// Routes for disk specifications

import { Router } from 'express';
import { DiskSpecificationController } from '../controllers/DiskSpecificationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// POST /api/disk-specifications/calculate — must come before /:id
router.post(
  '/calculate',
  authorize('admin', 'manager', 'bom_editor'),
  DiskSpecificationController.calculate
);

// GET /api/disk-specifications
router.get('/', authorize('admin', 'manager', 'bom_editor'), DiskSpecificationController.getAll);

// GET /api/disk-specifications/:id
router.get('/:id', authorize('admin', 'manager', 'bom_editor'), DiskSpecificationController.getById);

// POST /api/disk-specifications
router.post('/', authorize('admin', 'manager', 'bom_editor'), DiskSpecificationController.create);

// PUT /api/disk-specifications/:id
router.put('/:id', authorize('admin', 'manager', 'bom_editor'), DiskSpecificationController.update);

// DELETE /api/disk-specifications/:id
router.delete('/:id', authorize('admin'), DiskSpecificationController.delete);

export default router;

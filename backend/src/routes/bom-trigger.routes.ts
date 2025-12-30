// src/routes/bom-trigger.routes.ts
// Routing dla triggerów BOM

import { Router } from 'express';
import { BomTriggerController } from '../controllers/BomTriggerController';
import { authenticate, authorize } from '../middleware/auth';
import { validateDto } from '../middleware/validator';
import { CreateBomTriggerDto, UpdateBomTriggerDto, TestBomTriggerDto } from '../dto/BomTriggerDto';

const router = Router();

// Endpointy metadata (dostępne dla admin, manager, bom_editor)
router.get('/events', authenticate, authorize('admin', 'manager', 'bom_editor'), BomTriggerController.getEvents);
router.get('/actions', authenticate, authorize('admin', 'manager', 'bom_editor'), BomTriggerController.getActions);

// CRUD operacje (admin i manager)
router.get('/', authenticate, authorize('admin', 'manager', 'bom_editor'), BomTriggerController.list);
router.get('/:id', authenticate, authorize('admin', 'manager', 'bom_editor'), BomTriggerController.get);
router.post('/', authenticate, authorize('admin', 'manager'), validateDto(CreateBomTriggerDto), BomTriggerController.create);
router.put('/:id', authenticate, authorize('admin', 'manager'), validateDto(UpdateBomTriggerDto), BomTriggerController.update);
router.delete('/:id', authenticate, authorize('admin', 'manager'), BomTriggerController.delete);

// Operacje specjalne
router.post('/:id/toggle', authenticate, authorize('admin', 'manager'), BomTriggerController.toggle);
router.post('/:id/test', authenticate, authorize('admin', 'manager'), validateDto(TestBomTriggerDto), BomTriggerController.test);
router.get('/:id/logs', authenticate, authorize('admin', 'manager'), BomTriggerController.getLogs);

export default router;

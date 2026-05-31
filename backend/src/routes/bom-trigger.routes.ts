// src/routes/bom-trigger.routes.ts
// Routing dla triggerów BOM

import { Router } from 'express';
import { BomTriggerController } from '../controllers/BomTriggerController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { validateDto } from '../middleware/validator';
import { CreateBomTriggerDto, UpdateBomTriggerDto, TestBomTriggerDto } from '../dto/BomTriggerDto';

const router = Router();

// Endpointy metadata (dostępne dla admin, manager, bom_editor)
router.get('/events', authenticate, checkPermission('notifications', 'configureTriggers'), BomTriggerController.getEvents);
router.get('/actions', authenticate, checkPermission('notifications', 'configureTriggers'), BomTriggerController.getActions);

// CRUD operacje (admin i manager)
router.get('/', authenticate, checkPermission('notifications', 'configureTriggers'), BomTriggerController.list);
router.get('/:id', authenticate, checkPermission('notifications', 'configureTriggers'), BomTriggerController.get);
router.post('/', authenticate, checkPermission('notifications', 'configureTriggers'), validateDto(CreateBomTriggerDto), BomTriggerController.create);
router.put('/:id', authenticate, checkPermission('notifications', 'configureTriggers'), validateDto(UpdateBomTriggerDto), BomTriggerController.update);
router.delete('/:id', authenticate, checkPermission('notifications', 'configureTriggers'), BomTriggerController.delete);

// Operacje specjalne
router.post('/:id/toggle', authenticate, checkPermission('notifications', 'configureTriggers'), BomTriggerController.toggle);
router.post('/:id/test', authenticate, checkPermission('notifications', 'configureTriggers'), validateDto(TestBomTriggerDto), BomTriggerController.test);
router.get('/:id/logs', authenticate, checkPermission('notifications', 'configureTriggers'), BomTriggerController.getLogs);

export default router;

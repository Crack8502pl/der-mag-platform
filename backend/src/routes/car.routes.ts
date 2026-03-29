// src/routes/car.routes.ts
// Routes dla samochodów

import { Router } from 'express';
import { CarController } from '../controllers/CarController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';

const router = Router();

router.use(authenticate);

// Lista aktywnych samochodów — dostęp dla coordinator i admin (cars.read)
router.get('/', checkPermission('cars', 'read'), CarController.getCars);

// Przełącz brygadę — dostęp dla coordinator i admin (cars.update)
router.post('/:id/toggle-brigade', checkPermission('cars', 'update'), CarController.toggleBrigade);

export default router;

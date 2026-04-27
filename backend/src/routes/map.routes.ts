// src/routes/map.routes.ts
// Trasy dla endpointów mapy

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/PermissionMiddleware';
import { MapController } from '../controllers/MapController';

const router = Router();
router.use(authenticate);
router.get('/markers', requirePermission('map', 'read'), MapController.getMarkers);

export default router;

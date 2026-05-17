// backend/src/routes/railway.routes.ts

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { RailwayController } from '../controllers/RailwayController';

const router = Router();

// Order matters: /stations/line/:lineCode must be before /stations
router.get('/lines', authenticate, RailwayController.searchLines);
router.get('/lines/:code', authenticate, RailwayController.getLineByCode);
router.get('/stations/line/:lineCode', authenticate, RailwayController.getStationsForLine);
router.get('/stations', authenticate, RailwayController.searchStations);
router.post('/validate-km', authenticate, RailwayController.validateKilometraz);

export default router;

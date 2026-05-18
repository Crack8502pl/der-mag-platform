// src/routes/bomResolver.routes.ts
// Routes for the BOM resolver orchestration endpoint

import { Router } from 'express';
import { BomResolverController } from '../controllers/BomResolverController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/bom-resolver/resolve
 * Orchestrates template lookup, recorder selection and disk configuration
 * into a single BOM resolution response for the Wizard task-config step.
 */
router.post('/resolve', BomResolverController.resolve);

export default router;

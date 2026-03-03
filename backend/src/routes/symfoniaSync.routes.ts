// src/routes/symfoniaSync.routes.ts
// Routes for Symfonia warehouse stock sync - admin only

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { SymfoniaSyncController } from '../controllers/SymfoniaSyncController';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

router.post('/full', SymfoniaSyncController.fullSync);
router.post('/quick', SymfoniaSyncController.quickSync);
router.get('/status', SymfoniaSyncController.getStatus);
router.get('/history', SymfoniaSyncController.getHistory);
router.get('/progress', SymfoniaSyncController.getProgress);

export default router;

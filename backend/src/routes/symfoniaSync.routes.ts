// src/routes/symfoniaSync.routes.ts
// Routes for Symfonia warehouse stock sync and contracts sync - admin only

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { SymfoniaSyncController } from '../controllers/SymfoniaSyncController';
import { SymfoniaContractSyncController } from '../controllers/SymfoniaContractSyncController';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Warehouse stock sync (Magazyn)
router.post('/full', SymfoniaSyncController.fullSync);
router.post('/quick', SymfoniaSyncController.quickSync);
router.get('/status', SymfoniaSyncController.getStatus);
router.get('/history', SymfoniaSyncController.getHistory);
router.get('/progress', SymfoniaSyncController.getProgress);

// Contracts sync (Kontrakty)
router.post('/contracts/full', SymfoniaContractSyncController.fullSync);
router.post('/contracts/quick', SymfoniaContractSyncController.quickSync);
router.get('/contracts/status', SymfoniaContractSyncController.getStatus);
router.get('/contracts/history', SymfoniaContractSyncController.getHistory);
router.get('/contracts/progress', SymfoniaContractSyncController.getProgress);

export default router;

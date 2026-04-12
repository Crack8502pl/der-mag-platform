// src/routes/asset.routes.ts
// Trasy dla obiektów (assets)

import { Router } from 'express';
import { AssetController } from '../controllers/AssetController';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new AssetController();

// GET endpoints only (read-only)
router.get('/stats', authenticate, controller.getAssetStats);
router.get('/number/:assetNumber', authenticate, controller.getAssetByNumber);
router.get('/:id', authenticate, controller.getAssetById);
router.get('/', authenticate, controller.getAllAssets);

export default router;

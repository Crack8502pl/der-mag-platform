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

// Write operation endpoints
router.post('/', authenticate, controller.createAsset);
router.put('/:id', authenticate, controller.updateAsset);
router.patch('/:id/status', authenticate, controller.updateAssetStatus);
router.delete('/:id', authenticate, controller.deleteAsset);

export default router;

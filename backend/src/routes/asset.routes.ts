// src/routes/asset.routes.ts
// Trasy dla obiektów (assets)

import { Router } from 'express';
import { AssetController } from '../controllers/AssetController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/PermissionMiddleware';

const router = Router();
const controller = new AssetController();

// GET endpoints only (read-only)
router.get('/stats', authenticate, requirePermission('assets', 'read'), controller.getAssetStats);
router.get('/number/:assetNumber', authenticate, requirePermission('assets', 'read'), controller.getAssetByNumber);
router.get('/:id', authenticate, requirePermission('assets', 'read'), controller.getAssetById);
router.get('/', authenticate, requirePermission('assets', 'read'), controller.getAllAssets);

// Write operation endpoints
router.post('/', authenticate, requirePermission('assets', 'create'), controller.createAsset);
router.put('/:id', authenticate, requirePermission('assets', 'update'), controller.updateAsset);
router.patch('/:id/status', authenticate, requirePermission('assets', 'update'), controller.updateAssetStatus);
router.delete('/:id', authenticate, requirePermission('assets', 'delete'), controller.deleteAsset);

// Device linking endpoints
router.post('/:id/devices', authenticate, requirePermission('assets', 'update'), controller.linkDevices);
router.delete('/:id/devices/:deviceId', authenticate, requirePermission('assets', 'update'), controller.unlinkDevice);
router.get('/:id/devices', authenticate, requirePermission('assets', 'read'), controller.getAssetDevices);
router.get('/:id/bom-validation', authenticate, requirePermission('assets', 'read'), controller.validateBOM);

export default router;

// src/routes/device.routes.ts
import { Router } from 'express';
import { DeviceController } from '../controllers/DeviceController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/serial', authenticate, DeviceController.registerDevice);
router.get('/:serialNumber', authenticate, DeviceController.getDevice);
router.put('/:id/verify', authenticate, DeviceController.verifyDevice);

export default router;

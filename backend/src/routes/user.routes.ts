// src/routes/user.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Admin-only routes
router.get('/', authenticate, authorize('admin'), UserController.list);
router.get('/:id', authenticate, authorize('admin'), UserController.getById);
router.post('/', authenticate, authorize('admin'), UserController.create);
router.put('/:id', authenticate, authorize('admin'), UserController.update);
router.delete('/:id', authenticate, authorize('admin'), UserController.delete);

router.post('/:id/reset-password', authenticate, authorize('admin'), UserController.resetPassword);
router.post('/:id/deactivate', authenticate, authorize('admin'), UserController.deactivate);
router.post('/:id/activate', authenticate, authorize('admin'), UserController.activate);
router.put('/:id/role', authenticate, authorize('admin'), UserController.changeRole);

router.get('/:id/activity', authenticate, authorize('admin'), UserController.getActivity);
router.get('/:id/permissions', authenticate, authorize('admin'), UserController.getPermissions);

// User self-service: change own password
router.post('/change-password', authenticate, UserController.changePassword);

export default router;

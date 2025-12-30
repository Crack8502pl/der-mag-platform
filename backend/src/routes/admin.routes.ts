// src/routes/admin.routes.ts
// Admin routes for system configuration and user management

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { SystemConfigController } from '../controllers/SystemConfigController';
import { UserController } from '../controllers/UserController';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// ============================================
// System Configuration Routes
// ============================================

// SMTP Configuration
router.get('/config/smtp', SystemConfigController.getSmtpConfig);
router.put('/config/smtp', SystemConfigController.setSmtpConfig);
router.post('/config/smtp/test', SystemConfigController.testSmtpConnection);

// Portal Configuration
router.get('/config/portal', SystemConfigController.getPortalUrl);
router.put('/config/portal', SystemConfigController.setPortalUrl);

// ============================================
// User Management Routes
// ============================================

// List all users (including inactive)
router.get('/users', UserController.listAll);

// Create user with OTP
router.post('/users', UserController.createWithOTP);

// Update user
router.put('/users/:id', UserController.update);

// Activate/Deactivate user
router.post('/users/:id/activate', UserController.activate);
router.post('/users/:id/deactivate', UserController.deactivate);

// Reset user password (generates new OTP)
router.post('/users/:id/reset-password', UserController.resetPassword);

export default router;

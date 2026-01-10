// src/routes/admin.routes.ts
// Admin routes for system configuration and user management

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { requirePermission } from '../middleware/PermissionMiddleware';
import { SystemConfigController } from '../controllers/SystemConfigController';
import { UserController } from '../controllers/UserController';
import { RoleController } from '../controllers/RoleController';
import { AdminController } from '../controllers/AdminController';

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

// ============================================
// Role Management Routes
// ============================================

// Get permissions schema (no special permission required - any admin can view)
router.get('/roles/permissions-schema', authenticate, RoleController.getPermissionsSchema);

// Get all roles
router.get('/roles', RoleController.getAll);

// Get role by id
router.get('/roles/:id', RoleController.getById);

// Update role
router.put('/roles/:id', authenticate, requirePermission('users', 'update'), RoleController.update);

// Create role
router.post('/roles', authenticate, requirePermission('users', 'create'), RoleController.create);

// Delete role
router.delete('/roles/:id', authenticate, requirePermission('users', 'delete'), RoleController.delete);

// ============================================
// Database Management Routes
// ============================================

// Seed database (force reseed)
router.post('/seed-database', AdminController.seedDatabase);

export default router;

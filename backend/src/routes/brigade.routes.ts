// src/routes/brigade.routes.ts
// Routes for brigades

import { Router } from 'express';
import BrigadeController from '../controllers/BrigadeController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Brigades CRUD
// Admin, management_board, coordinator can create
router.post('/', checkPermission('brigades', 'create'), BrigadeController.createBrigade);

// All authenticated users with brigades.read permission can read
router.get('/', checkPermission('brigades', 'read'), BrigadeController.getBrigades);
router.get('/:id', checkPermission('brigades', 'read'), BrigadeController.getBrigade);

// Admin, management_board, coordinator can update
router.put('/:id', checkPermission('brigades', 'update'), BrigadeController.updateBrigade);

// Admin, management_board, coordinator can delete
router.delete('/:id', checkPermission('brigades', 'delete'), BrigadeController.deleteBrigade);

// Brigade statistics - requires read permission
router.get('/:id/stats', checkPermission('brigades', 'read'), BrigadeController.getStatistics);

// Brigade members
// Admin, management_board, coordinator can assign/update/remove members
router.post('/:id/members', checkPermission('brigades', 'assignMembers'), BrigadeController.addMember);
router.put('/:brigadeId/members/:memberId', checkPermission('brigades', 'assignMembers'), BrigadeController.updateMember);
router.delete('/:brigadeId/members/:memberId', checkPermission('brigades', 'assignMembers'), BrigadeController.removeMember);

// All users with viewMembers permission can view members
router.get('/:id/members', checkPermission('brigades', 'viewMembers'), BrigadeController.getMembers);

export default router;

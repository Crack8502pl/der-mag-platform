// src/routes/brigade.routes.ts
// Routes for brigades

import { Router } from 'express';
import BrigadeController from '../controllers/BrigadeController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Brigades CRUD
router.post('/', BrigadeController.createBrigade);
router.get('/', BrigadeController.getBrigades);
router.get('/:id', BrigadeController.getBrigade);
router.put('/:id', BrigadeController.updateBrigade);
router.delete('/:id', BrigadeController.deleteBrigade);

// Brigade statistics
router.get('/:id/stats', BrigadeController.getStatistics);

// Brigade members
router.post('/:id/members', BrigadeController.addMember);
router.get('/:id/members', BrigadeController.getMembers);
router.put('/:brigadeId/members/:memberId', BrigadeController.updateMember);
router.delete('/:brigadeId/members/:memberId', BrigadeController.removeMember);

export default router;

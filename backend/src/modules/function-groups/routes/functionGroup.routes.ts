// src/modules/function-groups/routes/functionGroup.routes.ts
// Montowane pod /api/admin (admin.routes.ts) – authenticate + requireAdmin są już nałożone.

import { Router } from 'express';
import { FunctionGroupController } from '../controllers/FunctionGroupController';

const router = Router();

router.get('/function-groups', FunctionGroupController.list);
router.post('/function-groups', FunctionGroupController.create);
router.get('/function-groups/:id', FunctionGroupController.getById);
router.put('/function-groups/:id', FunctionGroupController.update);
router.post('/function-groups/:id/deactivate', FunctionGroupController.deactivate);
router.get('/function-groups/:id/members', FunctionGroupController.listMembers);
router.post('/function-groups/:id/members', FunctionGroupController.addMember);
router.delete('/function-groups/:id/members/:userId', FunctionGroupController.removeMember);
router.get('/users/:id/function-groups', FunctionGroupController.listForUser);

export default router;

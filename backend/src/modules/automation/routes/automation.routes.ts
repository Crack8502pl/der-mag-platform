// src/modules/automation/routes/automation.routes.ts
// Montowane pod /api/automation. Uprawnienia: automation.read / build / run.

import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { checkPermission } from '../../../middleware/permissions';
import { AutomationController } from '../controllers/AutomationController';

const router = Router();

router.use(authenticate);
router.get('/actions', checkPermission('automation', 'read'), AutomationController.listActions);
router.get('/chains', checkPermission('automation', 'read'), AutomationController.getChains);
router.put('/chains', checkPermission('automation', 'build'), AutomationController.saveChain);
router.post('/chains/:id/test', checkPermission('automation', 'run'), AutomationController.testChain);
router.get('/runs', checkPermission('automation', 'read'), AutomationController.listRuns);

export default router;

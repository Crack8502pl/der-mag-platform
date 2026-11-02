// src/modules/workflow/routes/taskTypeSafety.routes.ts
// Montowane w /api/admin (authenticate + requireAdmin nadaje admin.routes).

import { Router } from 'express';
import { TaskTypeSafetyController } from '../controllers/TaskTypeSafetyController';

const router = Router();

router.get('/task-types', TaskTypeSafetyController.list);
router.patch('/task-types/:id', TaskTypeSafetyController.update);

export default router;

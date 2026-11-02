import { Router } from 'express';
import { VariableEngineController } from '../controllers/VariableEngineController';
import { authenticate } from '../middleware/auth';
import { checkAnyModulePermission } from '../middleware/permissions';

const router = Router();

router.use(authenticate);

router.get(
  '/variables',
  checkAnyModulePermission([
    { module: 'bom', actions: ['read'] },
    { module: 'forms', actions: ['read', 'create', 'update'] },
    { module: 'automation', actions: ['read'] },
  ]),
  VariableEngineController.listVariables
);

export default router;

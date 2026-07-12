import { Router } from 'express';
import { VariableEngineController } from '../controllers/VariableEngineController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';

const router = Router();

router.use(authenticate);

router.get(
  '/variables',
  checkPermission('bom', 'read'),
  VariableEngineController.listVariables
);

export default router;

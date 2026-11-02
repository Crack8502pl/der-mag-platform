import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { checkPermission } from '../../../middleware/permissions';
import { WorkflowInstanceController as controller } from '../controllers/WorkflowInstanceController';

const router = Router();
router.use(authenticate);
router.post('/', checkPermission('workflow', 'start'), controller.start);
router.get('/', checkPermission('workflow', 'read'), controller.list);
router.get('/my-steps', checkPermission('workflow', 'read'), controller.mySteps);
router.get('/:id', checkPermission('workflow', 'read'), controller.getById);
router.post('/:id/steps/current/complete', checkPermission('workflow', 'execute'), controller.complete);
router.post('/:id/force', checkPermission('workflow', 'override'), controller.force);
router.post('/:id/cancel', checkPermission('workflow', 'override'), controller.cancel);
export default router;

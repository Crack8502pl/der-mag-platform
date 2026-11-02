// src/modules/workflow/routes/workflow.routes.ts
// Montowane pod /api/workflows. Uprawnienia: workflow.read (podgląd) / workflow.build (edycja).
// Publikację w W3a wykonuje tylko administrator (sprawdzane w serwisie; W5a zastąpi to przeglądem).

import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { checkAnyPermission, checkPermission } from '../../../middleware/permissions';
import { WorkflowController } from '../controllers/WorkflowController';

const router = Router();
const canRead = checkAnyPermission('workflow', ['read', 'build']);
const canBuild = checkPermission('workflow', 'build');

router.use(authenticate);

router.get('/versions/:versionId', canRead, WorkflowController.getVersion);
router.put('/versions/:versionId', canBuild, WorkflowController.saveDraft);
router.post('/versions/:versionId/validate', canRead, WorkflowController.validate);
router.post('/versions/:versionId/next-version', canBuild, WorkflowController.nextVersion);
router.post('/versions/:versionId/publish', canBuild, WorkflowController.publish);

router.get('/', canRead, WorkflowController.list);
router.post('/', canBuild, WorkflowController.create);
router.get('/:id', canRead, WorkflowController.getById);
router.put('/:id', canBuild, WorkflowController.update);
router.delete('/:id', canBuild, WorkflowController.remove);
router.get('/:id/versions', canRead, WorkflowController.listVersions);

export default router;

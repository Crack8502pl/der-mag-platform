import { Router } from 'express';
import { SlicanAudioResolverController } from '../controllers/slican-audio-resolver.controller';
import { authenticate } from '../../../middleware/auth';
import { checkPermission } from '../../../middleware/permissions';

const router = Router();

router.use(authenticate);
router.post('/resolve', checkPermission('bom', 'read'), SlicanAudioResolverController.resolve);

export default router;

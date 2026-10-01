import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { checkPermission } from '../../../middleware/permissions';
import { SmokaAudioAggregationController } from '../controllers/smoka-audio-aggregation.controller';

const router = Router();

router.use(authenticate);
router.post('/aggregate', checkPermission('bom', 'read'), SmokaAudioAggregationController.aggregate);

export default router;

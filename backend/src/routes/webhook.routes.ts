import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/permissions';
import { WebhookController } from '../controllers/WebhookController';

const router = Router();

router.use(authenticate, requireAdmin);
router.get('/', WebhookController.listConfigs);
router.post('/', WebhookController.createConfig);
router.put('/:id', WebhookController.updateConfig);
router.delete('/:id', WebhookController.deleteConfig);
router.post('/test', WebhookController.testWebhook);

export default router;

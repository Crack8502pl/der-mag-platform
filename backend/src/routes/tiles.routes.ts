import { Router } from 'express';
import { TileProxyController } from '../controllers/TileProxyController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/permissions';

const router = Router();

// Publiczny endpoint - kafelki mapy (bez autentykacji dla szybkości)
router.get('/:z/:x/:y', TileProxyController.getTile);

// Endpointy administracyjne
router.get('/cache/stats', authenticate, requireAdmin, TileProxyController.getCacheStats);
router.delete('/cache', authenticate, requireAdmin, TileProxyController.clearCache);

export default router;

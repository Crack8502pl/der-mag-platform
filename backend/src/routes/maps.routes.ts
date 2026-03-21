// src/routes/maps.routes.ts
// Routing dla endpointów Google Maps

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { GoogleMapsController } from '../controllers/GoogleMapsController';

const router = Router();

// Parsowanie URL Google Maps i wyciąganie współrzędnych GPS
router.post('/parse-url', authenticate, GoogleMapsController.parseUrl);

// Generowanie URL nawigacji w Google Maps
router.post('/generate-navigation', authenticate, GoogleMapsController.generateNavigation);

// Obliczanie odległości między dwoma punktami GPS
router.post('/calculate-distance', authenticate, GoogleMapsController.calculateDistance);

export default router;

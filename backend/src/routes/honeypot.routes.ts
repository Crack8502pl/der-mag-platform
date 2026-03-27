// src/routes/honeypot.routes.ts
// Trasy API honeypota - wszystkie wymagają autentykacji i roli admin

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { HoneypotController } from '../controllers/HoneypotController';

const router = Router();

// Wszystkie endpointy honeypota wymagają autentykacji i roli admin
router.use(authenticate);
router.use(authorize('admin'));

// Statystyki honeypota
router.get('/stats', HoneypotController.getStats);

// Podejrzane adresy IP
router.get('/suspicious-ips', HoneypotController.getSuspiciousIPs);

// Lista logów
router.get('/logs', HoneypotController.getLogs);

// Eksport logów
router.get('/export', HoneypotController.exportLogs);

// Czyszczenie starych logów
router.delete('/cleanup', HoneypotController.cleanupLogs);

// Sprawdzanie IP
router.get('/check-ip/:ip', HoneypotController.checkIP);

export default router;

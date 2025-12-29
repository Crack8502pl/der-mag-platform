// src/routes/material.routes.ts
// Routing dla modułu zarządzania materiałami

import { Router } from 'express';
import { MaterialStockController } from '../controllers/MaterialStockController';
import { authenticate, authorize } from '../middleware/auth';
import { uploadMaterials } from '../middleware/upload';

const router = Router();

// Wszystkie endpointy wymagają uwierzytelnienia
router.use(authenticate);

// Lista i szczegóły materiałów
router.get('/stocks', MaterialStockController.getStocks);
router.get('/stocks/template', MaterialStockController.getTemplate);
router.get('/stocks/column-mappings', MaterialStockController.getColumnMappings);
router.get('/stocks/import-history', MaterialStockController.getImportHistory);
router.get('/stocks/import/:id', MaterialStockController.getImportDetails);
router.get('/stocks/:id', MaterialStockController.getStock);

// Operacje na materiałach (wymagają roli manager lub admin)
router.post('/stocks', authorize('admin', 'manager'), MaterialStockController.createStock);
router.put('/stocks/:id', authorize('admin', 'manager'), MaterialStockController.updateStock);
router.delete('/stocks/:id', authorize('admin', 'manager'), MaterialStockController.deleteStock);

// Import materiałów (wymagają roli manager lub admin)
router.post('/stocks/import', 
  authorize('admin', 'manager'), 
  uploadMaterials.single('file'), 
  MaterialStockController.importStocks
);

// Sprawdzanie dostępności i rezerwacje
router.post('/stocks/check-availability', MaterialStockController.checkAvailability);
router.post('/stocks/reserve', authorize('admin', 'manager', 'technician'), MaterialStockController.reserveMaterials);
router.post('/stocks/release', authorize('admin', 'manager', 'technician'), MaterialStockController.releaseMaterials);

// Endpoint statusu integracji Symfonia
router.get('/integrations/symfonia/status', MaterialStockController.getSymfoniaStatus);

export default router;

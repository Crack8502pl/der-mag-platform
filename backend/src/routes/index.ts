// src/routes/index.ts
// Główny router aplikacji

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import authRoutes from './auth.routes';
import taskRoutes from './task.routes';
import bomRoutes from './bom.routes';
import deviceRoutes from './device.routes';
import activityRoutes from './activity.routes';
import qualityRoutes from './quality.routes';
import ipRoutes from './ip.routes';
import metricsRoutes from './metrics.routes';
import userRoutes from './user.routes';
import notificationRoutes from './notification.routes';
import documentRoutes from './document.routes';
import importRoutes from './import.routes';
import bomBuilderRoutes from './bom-builder.routes';
import materialRoutes from './material.routes';
import bomTemplatesRoutes from './bom-templates.routes';
// New workflow routes
import contractRoutes from './contract.routes';
import subsystemRoutes from './subsystem.routes';
import networkRoutes from './network.routes';
import completionRoutes from './completion.routes';
import bomTriggerRoutes from './bom-trigger.routes';
import adminRoutes from './admin.routes';
import workflowBomRoutes from './workflow-bom.routes';
import prefabricationRoutes from './prefabrication.routes';
// Service tasks routes
import serviceTaskRoutes from './serviceTask.routes';
import brigadeRoutes from './brigade.routes';
// Warehouse stock routes
import warehouseStockRoutes from './warehouseStock.routes';
// BOM subsystem template routes
import bomSubsystemTemplateRoutes from './bomSubsystemTemplate.routes';
// BOM group routes
import bomGroupRoutes from './bomGroup.routes';
// BOM template dependency rule routes
import bomTemplateDependencyRuleRoutes from './bomTemplateDependencyRule.routes';
// Recorder and Disk Specification routes
import recorderSpecificationRoutes from './recorderSpecification.routes';
import diskSpecificationRoutes from './diskSpecification.routes';
// Symfonia MSSQL integration routes
import symfoniaIntegrationRoutes from './symfoniaIntegration.routes';
// Symfonia warehouse stock sync routes
import symfoniaSyncRoutes from './symfoniaSync.routes';
// Google Maps routes
import mapsRoutes from './maps.routes';
// Tile proxy routes
import tilesRoutes from './tiles.routes';
// Push notification routes
import pushRoutes from './push.routes';
// Honeypot routes
import honeypotRoutes from './honeypot.routes';
// Cars routes
import carRoutes from './car.routes';
// Health/connection monitoring routes
import healthRoutes from './health.routes';

// Wizard draft routes
import wizardDraftController from '../controllers/WizardDraftController';

const router = Router();

// Existing routes
router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/bom', bomRoutes);
router.use('/devices', deviceRoutes);
router.use('/activities', activityRoutes);
router.use('/quality', qualityRoutes);
router.use('/ip', ipRoutes);
router.use('/metrics', metricsRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/documents', documentRoutes);
router.use('/import', importRoutes);
router.use('/bom-builder', bomBuilderRoutes);
router.use('/materials', materialRoutes);
router.use('/bom-templates', bomTemplatesRoutes);

// Task types route
import { TaskController } from '../controllers/TaskController';
router.get('/task-types', authenticate, TaskController.getTaskTypes);

// New workflow routes
router.use('/contracts', contractRoutes);
router.use('/subsystems', subsystemRoutes);
router.use('/network', networkRoutes);
router.use('/completion', completionRoutes);
router.use('/bom-triggers', bomTriggerRoutes);
router.use('/workflow-bom', workflowBomRoutes);
router.use('/prefabrication', prefabricationRoutes);

// Service tasks routes
router.use('/service-tasks', serviceTaskRoutes);
router.use('/brigades', brigadeRoutes);

// Warehouse stock routes
router.use('/warehouse-stock', warehouseStockRoutes);

// BOM subsystem template routes
router.use('/bom-subsystem-templates', bomSubsystemTemplateRoutes);

// BOM group routes
router.use('/bom-groups', bomGroupRoutes);

// BOM template dependency rule routes
router.use('/bom-template-dependency-rules', bomTemplateDependencyRuleRoutes);

// Recorder and Disk Specification routes
router.use('/recorder-specifications', recorderSpecificationRoutes);
router.use('/disk-specifications', diskSpecificationRoutes);

// Symfonia MSSQL integration routes (admin only)
router.use('/admin/symfonia-integration', symfoniaIntegrationRoutes);

// Symfonia warehouse stock sync routes (admin only)
router.use('/admin/symfonia-sync', symfoniaSyncRoutes);

// Google Maps routes
router.use('/maps', mapsRoutes);

// Tile proxy routes
router.use('/tiles', tilesRoutes);

// Push notification routes
router.use('/push', pushRoutes);

// Honeypot admin routes
router.use('/admin/honeypot', honeypotRoutes);

// Cars routes
router.use('/cars', carRoutes);

// Health/connection monitoring routes (no auth required - lightweight endpoints)
router.use('/', healthRoutes);

// Wizard drafts routes
router.get('/wizard-drafts', authenticate, (req, res) => wizardDraftController.listDrafts(req, res));
router.get('/wizard-drafts/:wizardType', authenticate, (req, res) => wizardDraftController.getDraft(req, res));
router.post('/wizard-drafts/:wizardType', authenticate, (req, res) => wizardDraftController.saveDraft(req, res));
router.delete('/wizard-drafts/:wizardType', authenticate, (req, res) => wizardDraftController.deleteDraft(req, res));

// Cars admin sync
import { CarController } from '../controllers/CarController';
import { requireAdmin } from '../middleware/permissions';
router.post('/admin/cars/sync', authenticate, requireAdmin, CarController.syncCars);

// Permission SSE events endpoint (for authenticated users to receive real-time updates)
import { permissionBroadcastService } from '../services/PermissionBroadcastService';
import { decodePermissionError } from '../utils/permissionCodec';
import { sseTokenService } from '../services/SseTokenService';
import { User } from '../entities/User';

/**
 * POST /api/permissions/sse-token
 * Returns a short-lived, one-time SSE token for the authenticated user.
 * The client must use this token (instead of the long-lived access token)
 * in the EventSource URL to avoid leaking credentials in logs/history.
 */
router.post('/permissions/sse-token', authenticate, async (req, res) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: req.userId, active: true },
      relations: ['role'],
    });

    if (!user || !user.role) {
      res.status(403).json({ success: false, message: 'Brak roli użytkownika' });
      return;
    }

    const sseToken = sseTokenService.create(user.role.id);
    res.json({ success: true, data: { sseToken } });
  } catch (error) {
    console.error('SSE token generation error:', error);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

/**
 * GET /api/permissions/events?sseToken=...
 * SSE stream for real-time permission updates.
 * Uses a short-lived one-time token (obtained via POST /permissions/sse-token)
 * instead of the access token to avoid credential leakage in URLs.
 * Auth errors are returned as SSE events (not HTTP errors) to prevent
 * EventSource from entering an infinite reconnect loop.
 */
router.get('/permissions/events', async (req, res) => {
  // Always upgrade to SSE immediately so EventSource doesn't get a non-200
  // response that would trigger infinite reconnect loops.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const sseToken = req.query.sseToken as string | undefined;
    if (!sseToken) {
      sendEvent({ type: 'unauthorized', message: 'Brak tokenu SSE' });
      res.end();
      return;
    }

    const roleId = sseTokenService.consume(sseToken);
    if (roleId === null) {
      sendEvent({ type: 'unauthorized', message: 'Nieprawidłowy lub wygasły token SSE' });
      res.end();
      return;
    }

    // Send initial event to confirm connection
    sendEvent({ type: 'connected', roleId });

    const client = permissionBroadcastService.addClient(roleId, res);

    // Keep-alive ping every 30 seconds.
    // The ": ping" format is a valid SSE comment that prevents proxy timeouts
    // without triggering the client's onmessage handler.
    const keepAlive = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch {
        // res.write failed – client disconnected without firing the 'close' event
        // (can happen with certain proxy/network failure modes). Clean up here to
        // prevent Response objects from leaking in permissionBroadcastService.
        clearInterval(keepAlive);
        permissionBroadcastService.removeClient(client);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
      permissionBroadcastService.removeClient(client);
    });
  } catch (error) {
    console.error('SSE permissions error:', error);
    sendEvent({ type: 'error', message: 'Wewnętrzny błąd serwera' });
    res.end();
  }
});

// Permission decode endpoint (admin only)
router.post('/admin/permissions/decode', authenticate, requireAdmin, (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, message: 'Brak kodu' });
      return;
    }
    const payload = decodePermissionError(code);
    if (!payload) {
      res.status(400).json({ success: false, message: 'Nieprawidłowy kod błędu uprawnień' });
      return;
    }
    res.json({ success: true, data: payload });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

// Admin routes
router.use('/admin', adminRoutes);

// Importy dla aliasów szablonów dokumentów
import { BOMBuilderController } from '../controllers/BOMBuilderController';
import { uploadTemplate } from '../middleware/upload';

// Alias dla szablonów dokumentów (tylko endpointy związane z szablonami)
router.get('/document-templates', authenticate, BOMBuilderController.getTemplates);
router.post('/document-templates', authenticate, authorize('admin', 'manager'), uploadTemplate.single('file'), BOMBuilderController.uploadTemplate);
router.get('/document-templates/:id', authenticate, BOMBuilderController.getTemplate);
router.post('/document-templates/:id/generate', authenticate, BOMBuilderController.generateDocument);
router.delete('/document-templates/:id', authenticate, authorize('admin', 'manager'), BOMBuilderController.deleteTemplate);

// Dodatkowa trasa dla BOM zadań
import { BOMController } from '../controllers/BOMController';
router.get('/tasks/:taskNumber/bom', authenticate, BOMController.getTaskMaterials);
router.put('/tasks/:taskNumber/bom/:id', authenticate, BOMController.updateMaterial);

// Dodatkowa trasa dla urządzeń zadań
import { AppDataSource } from '../config/database';
import { Task } from '../entities/Task';
import { Device } from '../entities/Device';
router.get('/tasks/:taskNumber/devices', authenticate, async (req, res) => {
  try {
    const { taskNumber } = req.params;
    const task = await AppDataSource.getRepository(Task).findOne({ where: { taskNumber } });
    if (!task) {
      res.status(404).json({ success: false, message: 'Zadanie nie znalezione' });
      return;
    }
    const devices = await AppDataSource.getRepository(Device).find({
      where: { taskId: task.id }
    });
    res.json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

// Dodatkowa trasa dla aktywności zadań
import { TaskActivity } from '../entities/TaskActivity';
router.get('/tasks/:taskNumber/activities', authenticate, async (req, res) => {
  try {
    const { taskNumber } = req.params;
    const task = await AppDataSource.getRepository(Task).findOne({ where: { taskNumber } });
    if (!task) {
      res.status(404).json({ success: false, message: 'Zadanie nie znalezione' });
      return;
    }
    const activities = await AppDataSource.getRepository(TaskActivity).find({
      where: { taskId: task.id },
      relations: ['completedBy'],
      order: { sequence: 'ASC' }
    });
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

// Dodatkowa trasa dla zdjęć zadań
import { QualityController } from '../controllers/QualityController';
router.get('/tasks/:taskNumber/photos', authenticate, QualityController.getTaskPhotos);

export default router;

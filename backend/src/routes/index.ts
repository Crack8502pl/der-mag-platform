// src/routes/index.ts
// Główny router aplikacji

import { Router } from 'express';
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

// Admin routes
router.use('/admin', adminRoutes);

// Importy dla aliasów szablonów dokumentów
import { BOMBuilderController } from '../controllers/BOMBuilderController';
import { uploadTemplate } from '../middleware/upload';
import { authenticate, authorize } from '../middleware/auth';

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

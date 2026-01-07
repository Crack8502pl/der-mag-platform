// src/routes/serviceTask.routes.ts
// Routes for service tasks

import { Router } from 'express';
import ServiceTaskController from '../controllers/ServiceTaskController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Service tasks CRUD
router.post('/', ServiceTaskController.createTask);
router.get('/', ServiceTaskController.getTasks);
router.get('/stats', ServiceTaskController.getStatistics);
router.get('/:id', ServiceTaskController.getTask);
router.put('/:id', ServiceTaskController.updateTask);
router.delete('/:id', ServiceTaskController.deleteTask);

// Status updates
router.patch('/:id/status', ServiceTaskController.updateStatus);

// Brigade assignment
router.post('/:id/assign-brigade', ServiceTaskController.assignBrigade);

// Activities
router.post('/:id/activities', ServiceTaskController.addActivity);
router.get('/:id/activities', ServiceTaskController.getActivities);

export default router;

// src/routes/task-relationship.routes.ts
// Routes for task relationship management

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import taskRelationshipController from '../controllers/TaskRelationshipController';

const router = Router();

// Get relationships for a subsystem
router.get(
  '/subsystem/:subsystemId',
  authenticate,
  (req, res) => taskRelationshipController.getBySubsystem(req, res)
);

// Get children of a parent task
router.get(
  '/children/:parentTaskId',
  authenticate,
  (req, res) => taskRelationshipController.getChildren(req, res)
);

// Create single relationship
router.post(
  '/',
  authenticate,
  (req, res) => taskRelationshipController.create(req, res)
);

// Bulk create relationships (by task IDs)
router.post(
  '/bulk',
  authenticate,
  (req, res) => taskRelationshipController.bulkCreate(req, res)
);

// Bulk create from wizard (by task numbers)
router.post(
  '/bulk-from-wizard',
  authenticate,
  (req, res) => taskRelationshipController.bulkCreateFromWizard(req, res)
);

// Delete all relationships for a parent task
router.delete(
  '/parent/:parentTaskId',
  authenticate,
  (req, res) => taskRelationshipController.deleteByParent(req, res)
);

export default router;

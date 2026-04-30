// src/routes/networkTopology.routes.ts
// Routes for Network Topology CRUD

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import networkTopologyController from '../controllers/NetworkTopologyController';

const router = Router();

router.use(authenticate);

// POST   /api/topologies                → create
router.post('/', networkTopologyController.create);

// GET    /api/topologies/:id             → getById
router.get('/:id', networkTopologyController.getById);

export default router;

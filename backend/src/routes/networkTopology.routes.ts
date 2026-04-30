// src/routes/networkTopology.routes.ts
// Routes for Network Topology CRUD

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import networkTopologyController from '../controllers/NetworkTopologyController';

const router = Router();

router.use(authenticate);

// GET    /api/network-topologies                → getAll (must be before /:id)
router.get('/', networkTopologyController.getAll);

// POST   /api/network-topologies                → create
router.post('/', networkTopologyController.create);

// GET    /api/network-topologies/contract/:contractId
//        → getAllByContract (must be before /:id to avoid conflict)
router.get('/contract/:contractId', networkTopologyController.getAllByContract);

// GET    /api/network-topologies/contract/:contractId/subsystem/:subsystemIndex/history
//        → getHistory (must be before /subsystem/:subsystemIndex to avoid conflict)
router.get(
  '/contract/:contractId/subsystem/:subsystemIndex/history',
  networkTopologyController.getHistory,
);

// GET    /api/network-topologies/contract/:contractId/subsystem/:subsystemIndex
//        → getByContractAndSubsystem (latest version)
router.get(
  '/contract/:contractId/subsystem/:subsystemIndex',
  networkTopologyController.getLatest,
);

// PUT    /api/network-topologies/:id            → update (immutable – creates new version)
router.put('/:id', networkTopologyController.update);

// GET    /api/network-topologies/:id             → getById
router.get('/:id', networkTopologyController.getById);

// DELETE /api/network-topologies/:id             → softDelete
router.delete('/:id', networkTopologyController.softDelete);

export default router;

// src/routes/task.routes.ts
import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { validateDto } from '../middleware/validator';
import { CreateTaskDto } from '../dto/CreateTaskDto';
import { UpdateTaskDto } from '../dto/UpdateTaskDto';

const router = Router();

router.get('/', authenticate, TaskController.list);
router.get('/my', authenticate, TaskController.myTasks);
router.get('/with-gps', authenticate, TaskController.getTasksWithGps);
router.get('/:taskNumber', authenticate, TaskController.get);
router.post('/', authenticate, checkPermission('tasks', 'create'), validateDto(CreateTaskDto), TaskController.create);
router.put('/:taskNumber', authenticate, checkPermission('tasks', 'update'), validateDto(UpdateTaskDto), TaskController.update);
router.patch('/:taskNumber/status', authenticate, TaskController.updateStatus);
router.delete('/:taskNumber', authenticate, checkPermission('tasks', 'update'), TaskController.delete);
router.post('/:taskNumber/assign', authenticate, checkPermission('tasks', 'assign'), TaskController.assign);
router.post('/:taskNumber/request-shipment', authenticate, TaskController.requestShipment);

export default router;

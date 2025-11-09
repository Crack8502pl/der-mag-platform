// src/routes/task.routes.ts
import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { authenticate, authorize } from '../middleware/auth';
import { validateDto } from '../middleware/validator';
import { CreateTaskDto } from '../dto/CreateTaskDto';
import { UpdateTaskDto } from '../dto/UpdateTaskDto';

const router = Router();

router.get('/', authenticate, TaskController.list);
router.get('/my', authenticate, TaskController.myTasks);
router.get('/:taskNumber', authenticate, TaskController.get);
router.post('/', authenticate, authorize('admin', 'manager', 'coordinator'), validateDto(CreateTaskDto), TaskController.create);
router.put('/:taskNumber', authenticate, authorize('admin', 'manager', 'coordinator'), validateDto(UpdateTaskDto), TaskController.update);
router.patch('/:taskNumber/status', authenticate, TaskController.updateStatus);
router.delete('/:taskNumber', authenticate, authorize('admin', 'manager'), TaskController.delete);
router.post('/:taskNumber/assign', authenticate, authorize('admin', 'manager', 'coordinator'), TaskController.assign);

export default router;

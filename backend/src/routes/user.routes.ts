// src/routes/user.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate, authorize } from '../middleware/auth';
import { validateDto } from '../middleware/validator';
import { CreateUserDto } from '../dto/CreateUserDto';

const router = Router();

router.get('/', authenticate, UserController.list);
router.post('/', authenticate, authorize('admin'), validateDto(CreateUserDto), UserController.create);
router.put('/:id', authenticate, authorize('admin'), UserController.update);

export default router;

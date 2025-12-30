// src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';
import { validateDto } from '../middleware/validator';
import { LoginDto } from '../dto/LoginDto';
import { ChangePasswordDto } from '../dto/ChangePasswordDto';

const router = Router();

router.post('/login', validateDto(LoginDto), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);
router.post('/logout/all', authenticate, AuthController.logoutAll);
router.get('/sessions', authenticate, AuthController.getActiveSessions);
router.get('/me', authenticate, AuthController.me);
router.post('/change-password', authenticate, validateDto(ChangePasswordDto), AuthController.changePassword);

export default router;

// src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';
import { validateDto } from '../middleware/validator';
import { LoginDto } from '../dto/LoginDto';
import { ChangePasswordDto } from '../dto/ChangePasswordDto';
import { generateCsrfToken } from '../middleware/csrf';

const router = Router();

// CSRF token endpoint for SPA bootstrap
router.get('/csrf-token', (req, res) => {
  const csrfToken = generateCsrfToken();
  
  // Set CSRF token cookie
  res.cookie('csrf-token', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
  
  res.json({
    success: true,
    data: {
      csrfToken
    }
  });
});

router.post('/login', validateDto(LoginDto), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);
router.post('/logout/all', authenticate, AuthController.logoutAll);
router.get('/sessions', authenticate, AuthController.getActiveSessions);
router.get('/me', authenticate, AuthController.me);
router.post('/change-password', authenticate, validateDto(ChangePasswordDto), AuthController.changePassword);
router.post('/forgot-password', AuthController.forgotPassword);

export default router;

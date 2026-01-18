// src/routes/user.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * GET /api/users/project-managers
 * Get list of users who can be project managers
 * - For admin/board: returns all active admin + board + manager users
 * - For manager: returns only themselves
 */
router.get('/project-managers', authenticate, async (req: any, res: any) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Brak autoryzacji' });
    }

    const userRole = currentUser.role?.name || currentUser.role;
    
    // For manager - return only their own data
    if (userRole !== 'admin' && userRole !== 'board') {
      return res.json({
        success: true,
        data: [{
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          employeeCode: currentUser.employeeCode,
          role: currentUser.role
        }]
      });
    }
    
    // For admin/board - return all: admin + board + manager
    const { AppDataSource } = require('../config/database');
    const { User } = require('../entities/User');
    
    const userRepository = AppDataSource.getRepository(User);
    const managers = await userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.active = :active', { active: true })
      .andWhere('role.name IN (:...roles)', { roles: ['admin', 'board', 'manager'] })
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .getMany();
    
    res.json({
      success: true,
      data: managers.map((m: any) => ({
        id: m.id,
        username: m.username,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        employeeCode: m.employeeCode,
        role: m.role
      }))
    });
  } catch (error: any) {
    console.error('Error fetching project managers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Błąd pobierania listy kierowników',
      error: error.message 
    });
  }
});

// Admin-only routes
router.get('/', authenticate, authorize('admin'), UserController.list);
router.get('/:id', authenticate, authorize('admin'), UserController.getById);
router.post('/', authenticate, authorize('admin'), UserController.create);
router.put('/:id', authenticate, authorize('admin'), UserController.update);
router.delete('/:id', authenticate, authorize('admin'), UserController.delete);

router.post('/:id/reset-password', authenticate, authorize('admin'), UserController.resetPassword);
router.post('/:id/deactivate', authenticate, authorize('admin'), UserController.deactivate);
router.post('/:id/activate', authenticate, authorize('admin'), UserController.activate);
router.put('/:id/role', authenticate, authorize('admin'), UserController.changeRole);

router.get('/:id/activity', authenticate, authorize('admin'), UserController.getActivity);
router.get('/:id/permissions', authenticate, authorize('admin'), UserController.getPermissions);

// User self-service: change own password
router.post('/change-password', authenticate, UserController.changePassword);

export default router;

// src/routes/user.routes.ts
import { Router, Request, Response } from 'express';
import { UserController } from '../controllers/UserController';
import { UserPreferencesController } from '../controllers/UserPreferencesController';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

const router = Router();

/**
 * GET /api/users/managers
 * Get list of users who can manage projects (admin, management_board, manager, coordinator)
 */
router.get('/managers', authenticate, async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const managers = await userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.active = :active', { active: true })
      .andWhere('user.deletedAt IS NULL')
      .andWhere('role.name IN (:...roles)', {
        roles: ['admin', 'management_board', 'manager', 'coordinator']
      })
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .getMany();

    res.json({
      success: true,
      data: managers.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        employeeCode: m.employeeCode,
        role: (m.role as any)?.name
      }))
    });
  } catch (error: any) {
    console.error('Error fetching managers:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd pobierania listy kierowników'
    });
  }
});

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

// User self-service routes (literal paths must be registered before parameterized /:id routes)
router.post('/change-password', authenticate, UserController.changePassword);
router.get('/me/preferences', authenticate, UserPreferencesController.getPreferences);
router.put('/me/preferences', authenticate, UserPreferencesController.updatePreferences);
router.put('/me/profile', authenticate, UserPreferencesController.updateProfile);
router.put('/me/password', authenticate, UserPreferencesController.changePassword);

// Permission-based routes
router.get('/', authenticate, checkPermission('users', 'read'), UserController.list);
router.get('/:id', authenticate, checkPermission('users', 'read'), UserController.getById);
router.post('/', authenticate, checkPermission('users', 'create'), UserController.create);
router.put('/:id', authenticate, checkPermission('users', 'update'), UserController.update);
router.delete('/:id', authenticate, checkPermission('users', 'delete'), UserController.delete);

router.post('/:id/reset-password', authenticate, checkPermission('users', 'update'), UserController.resetPassword);
router.post('/:id/deactivate', authenticate, checkPermission('users', 'update'), UserController.deactivate);
router.post('/:id/activate', authenticate, checkPermission('users', 'update'), UserController.activate);
router.put('/:id/role', authenticate, checkPermission('users', 'update'), UserController.changeRole);

router.get('/:id/activity', authenticate, checkPermission('users', 'read'), UserController.getActivity);
router.get('/:id/permissions', authenticate, checkPermission('users', 'read'), UserController.getPermissions);

export default router;

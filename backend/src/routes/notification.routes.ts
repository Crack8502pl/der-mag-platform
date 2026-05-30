import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Notification } from '../entities/Notification';
import { UserPreferences } from '../entities/UserPreferences';
import { NotificationController } from '../controllers/NotificationController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const type = String(req.query.type || '').trim();
    const status = String(req.query.status || '').trim();

    const repo = AppDataSource.getRepository(Notification);
    const qb = repo.createQueryBuilder('notification').where('notification.userId = :userId', { userId: req.userId });
    if (type) qb.andWhere('notification.type = :type', { type });
    if (status === 'read') qb.andWhere('notification.isRead = true');
    if (status === 'unread') qb.andWhere('notification.isRead = false');

    qb.orderBy('notification.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Notification);
    const count = await repo.count({ where: { userId: req.userId, isRead: false } });
    res.json({ success: true, data: { count } });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await AppDataSource.getRepository(Notification)
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId AND isRead = false', { userId: req.userId })
      .execute();

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Notification);
    const notification = await repo.findOne({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!notification) {
      res.status(404).json({ success: false, message: 'Powiadomienie nie znalezione' });
      return;
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await repo.save(notification);
    res.json({ success: true, data: notification });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(UserPreferences);
    const preferences = await repo.findOne({ where: { userId: req.userId } });

    res.json({
      success: true,
      data: {
        email: preferences?.emailNotifications ?? true,
        sms: preferences?.pushNotifications ?? false,
        modules: {
          contracts: true,
          tasks: true,
          devices: true,
          photos: true,
          documents: true,
          reports: false,
        },
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(UserPreferences);
    let preferences = await repo.findOne({ where: { userId: req.userId } });
    if (!preferences) {
      preferences = repo.create({ userId: req.userId!, theme: 'grover' });
    }

    preferences.emailNotifications = !!req.body.email;
    preferences.pushNotifications = !!req.body.sms;

    await repo.save(preferences);

    res.json({
      success: true,
      data: {
        email: preferences.emailNotifications,
        sms: preferences.pushNotifications,
        modules: req.body.modules || {},
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

// Existing queue/config endpoints
router.post('/test', NotificationController.testEmail);
router.get('/queue/stats', NotificationController.getQueueStats);
router.get('/queue/failed', NotificationController.getFailedJobs);
router.post('/queue/retry/:jobId', NotificationController.retryFailedJob);
router.post('/queue/clear', NotificationController.clearQueue);
router.get('/config', NotificationController.checkConfig);

export default router;

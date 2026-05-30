import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { authenticate } from '../middleware/auth';
import { Contract } from '../entities/Contract';
import { SubsystemTask } from '../entities/SubsystemTask';
import { WarehouseStock } from '../entities/WarehouseStock';
import { Device } from '../entities/Device';

const router = Router();
router.use(authenticate);

router.get('/contracts', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Contract);
    const [total, active, completed, cancelled, recentContracts] = await Promise.all([
      repo.count(),
      repo.count({ where: [{ status: 'ACTIVE' as any }, { status: 'IN_PROGRESS' as any }] }),
      repo.count({ where: { status: 'COMPLETED' as any } }),
      repo.count({ where: { status: 'CANCELLED' as any } }),
      repo.find({ order: { createdAt: 'DESC' }, take: 10 }),
    ]);

    const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);
    res.json({ success: true, data: { total, active, completed, cancelled, progressPercent, recentContracts } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(SubsystemTask);
    const tasks = await repo.find({ order: { createdAt: 'DESC' }, take: 200 });

    const byStatus = tasks.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    const overdueTasks = tasks
      .filter(task => task.deploymentScheduledAt && !task.deploymentCompletedAt && new Date(task.deploymentScheduledAt) < new Date())
      .slice(0, 20)
      .map(task => ({ id: task.id, taskNumber: task.taskNumber, title: task.taskName, plannedEndDate: task.deploymentScheduledAt, status: task.status }));

    const total = tasks.length;
    const delayed = overdueTasks.length;
    const onTime = Math.max(0, total - delayed);

    res.json({
      success: true,
      data: {
        byStatus,
        overdueTasks,
        sla: {
          total,
          onTime,
          delayed,
          avgCompletionDays: 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.get('/resources', async (_req, res) => {
  try {
    const repo = AppDataSource.getRepository(WarehouseStock);
    const lowStock = await repo.createQueryBuilder('stock')
      .where('stock.minStockLevel IS NOT NULL')
      .andWhere('stock.quantityAvailable <= stock.minStockLevel')
      .orderBy('stock.quantityAvailable', 'ASC')
      .limit(50)
      .getMany();

    res.json({ success: true, data: { lowStock } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.get('/kpi', async (_req, res) => {
  try {
    const contractRepo = AppDataSource.getRepository(Contract);
    const taskRepo = AppDataSource.getRepository(SubsystemTask);
    const deviceRepo = AppDataSource.getRepository(Device);

    const [contracts, tasks, devices] = await Promise.all([
      contractRepo.find({ select: ['createdAt'] }),
      taskRepo.find({ select: ['createdAt'] }),
      deviceRepo.find({ select: ['createdAt'] }),
    ]);

    const now = new Date();
    const rows = Array.from({ length: 6 }).map((_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

      const countForMonth = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === month;

      return {
        month,
        contracts: contracts.filter(item => countForMonth(new Date(item.createdAt))).length,
        tasks: tasks.filter(item => countForMonth(new Date(item.createdAt))).length,
        newDevices: devices.filter(item => countForMonth(new Date(item.createdAt))).length,
      };
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.post('/export/excel', async (req, res) => {
  const type = req.body?.type || 'contracts';
  const content = `type,value\nreport,${type}\nexported,${new Date().toISOString()}`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="report-${type}.xlsx"`);
  res.send(Buffer.from(content));
});

router.post('/export/pdf', async (req, res) => {
  const type = req.body?.type || 'contracts';
  const content = `Raport ${type}\nWygenerowano: ${new Date().toISOString()}`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-${type}.pdf"`);
  res.send(Buffer.from(content));
});

export default router;

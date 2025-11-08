// src/services/MetricsService.ts
// Serwis statystyk i metryk

import { AppDataSource } from '../config/database';
import { Task } from '../entities/Task';
import { TaskMetric } from '../entities/TaskMetric';
import { TaskAssignment } from '../entities/TaskAssignment';

export class MetricsService {
  /**
   * Pobiera statystyki dla dashboardu
   */
  static async getDashboardStats(): Promise<{
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    completedToday: number;
    averageCompletionTime: number;
  }> {
    const taskRepository = AppDataSource.getRepository(Task);

    const totalTasks = await taskRepository.count({
      where: { deletedAt: null as any }
    });

    const activeTasks = await taskRepository.count({
      where: { 
        status: 'in_progress',
        deletedAt: null as any
      }
    });

    const completedTasks = await taskRepository.count({
      where: { 
        status: 'completed',
        deletedAt: null as any
      }
    });

    // Zadania ukończone dzisiaj
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const completedToday = await taskRepository
      .createQueryBuilder('task')
      .where('task.status = :status', { status: 'completed' })
      .andWhere('task.actual_end_date >= :today', { today })
      .andWhere('task.deleted_at IS NULL')
      .getCount();

    // Średni czas realizacji
    const completedWithDates = await taskRepository
      .createQueryBuilder('task')
      .select('AVG(EXTRACT(EPOCH FROM (task.actual_end_date - task.actual_start_date)))', 'avg_seconds')
      .where('task.status = :status', { status: 'completed' })
      .andWhere('task.actual_start_date IS NOT NULL')
      .andWhere('task.actual_end_date IS NOT NULL')
      .andWhere('task.deleted_at IS NULL')
      .getRawOne();

    const averageCompletionTime = completedWithDates?.avg_seconds 
      ? Math.round(completedWithDates.avg_seconds / 3600) // Konwersja na godziny
      : 0;

    return {
      totalTasks,
      activeTasks,
      completedTasks,
      completedToday,
      averageCompletionTime
    };
  }

  /**
   * Statystyki zadań według typu
   */
  static async getTaskTypeStats(): Promise<any[]> {
    const taskRepository = AppDataSource.getRepository(Task);

    return await taskRepository
      .createQueryBuilder('task')
      .select('task_type.name', 'taskTypeName')
      .addSelect('COUNT(task.id)', 'count')
      .addSelect('SUM(CASE WHEN task.status = \'completed\' THEN 1 ELSE 0 END)', 'completed')
      .leftJoin('task.taskType', 'task_type')
      .where('task.deleted_at IS NULL')
      .groupBy('task_type.name')
      .getRawMany();
  }

  /**
   * Statystyki użytkownika
   */
  static async getUserStats(userId: number): Promise<{
    assignedTasks: number;
    completedTasks: number;
    activeTasksthis: number;
    averageCompletionTime: number;
  }> {
    const assignmentRepository = AppDataSource.getRepository(TaskAssignment);
    const taskRepository = AppDataSource.getRepository(Task);

    const assignedTasks = await assignmentRepository.count({
      where: { userId }
    });

    const assignments = await assignmentRepository.find({
      where: { userId },
      relations: ['task']
    });

    const taskIds = assignments.map(a => a.taskId);

    let completedTasks = 0;
    let activeTasks = 0;

    if (taskIds.length > 0) {
      completedTasks = await taskRepository
        .createQueryBuilder('task')
        .where('task.id IN (:...taskIds)', { taskIds })
        .andWhere('task.status = :status', { status: 'completed' })
        .andWhere('task.deleted_at IS NULL')
        .getCount();

      activeTasks = await taskRepository
        .createQueryBuilder('task')
        .where('task.id IN (:...taskIds)', { taskIds })
        .andWhere('task.status IN (:...statuses)', { 
          statuses: ['assigned', 'started', 'in_progress'] 
        })
        .andWhere('task.deleted_at IS NULL')
        .getCount();
    }

    return {
      assignedTasks,
      completedTasks,
      activeTasksthis: activeTasks,
      averageCompletionTime: 0 // TODO: Implementacja
    };
  }

  /**
   * Statystyki dzienne
   */
  static async getDailyStats(days: number = 30): Promise<any[]> {
    const taskRepository = AppDataSource.getRepository(Task);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await taskRepository
      .createQueryBuilder('task')
      .select('DATE(task.actual_end_date)', 'date')
      .addSelect('COUNT(task.id)', 'count')
      .where('task.status = :status', { status: 'completed' })
      .andWhere('task.actual_end_date >= :startDate', { startDate })
      .andWhere('task.deleted_at IS NULL')
      .groupBy('DATE(task.actual_end_date)')
      .orderBy('DATE(task.actual_end_date)', 'ASC')
      .getRawMany();
  }
}

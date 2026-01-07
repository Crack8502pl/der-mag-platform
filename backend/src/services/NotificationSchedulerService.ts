// src/services/NotificationSchedulerService.ts
// Service for scheduling and managing email notifications
// TODO: Implement full notification scheduling with cron jobs

import { AppDataSource } from '../config/database';
import { NotificationSchedule } from '../entities/NotificationSchedule';
import EmailService from './EmailService';

export class NotificationSchedulerService {
  private scheduleRepository = AppDataSource.getRepository(NotificationSchedule);

  /**
   * Get all notification schedules
   */
  async getSchedules(): Promise<NotificationSchedule[]> {
    return await this.scheduleRepository.find({
      order: { notificationType: 'ASC' },
    });
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(id: number): Promise<NotificationSchedule | null> {
    return await this.scheduleRepository.findOne({ where: { id } });
  }

  /**
   * Update schedule
   */
  async updateSchedule(
    id: number,
    data: Partial<NotificationSchedule>
  ): Promise<NotificationSchedule> {
    const schedule = await this.getScheduleById(id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    Object.assign(schedule, data);
    return await this.scheduleRepository.save(schedule);
  }

  /**
   * Send daily brigade report
   * TODO: Implement full logic with actual email templates
   */
  async sendDailyBrigadeReport(): Promise<void> {
    console.log('Sending daily brigade reports...');
    // Implementation will be added in future iterations
  }

  /**
   * Send daily management report
   * TODO: Implement full logic with actual email templates
   */
  async sendDailyManagementReport(): Promise<void> {
    console.log('Sending daily management reports...');
    // Implementation will be added in future iterations
  }

  /**
   * Send weekly manager report
   * TODO: Implement full logic with actual email templates
   */
  async sendWeeklyManagerReport(): Promise<void> {
    console.log('Sending weekly manager reports...');
    // Implementation will be added in future iterations
  }

  /**
   * Send brigade assignment notification
   * TODO: Implement full logic with actual email templates
   */
  async sendBrigadeAssignmentNotification(
    userId: number,
    brigadeId: number
  ): Promise<void> {
    console.log(`Sending brigade assignment notification to user ${userId} for brigade ${brigadeId}`);
    // Implementation will be added in future iterations
  }
}

export default new NotificationSchedulerService();

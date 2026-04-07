// src/entities/NotificationSchedule.ts
// Encja harmonogramu powiadomień email

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('notification_schedules')
export class NotificationSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'notification_type', length: 50 })
  notificationType: string; // 'daily_brigade_report', 'daily_management_report', 'weekly_manager_report', 'brigade_assignment'

  @Column({ type: 'varchar', name: 'schedule_cron', length: 50 })
  scheduleCron: string; // np. '0 18 * * *' dla 18:00 każdy dzień

  @Column({ name: 'last_run', type: 'timestamp', nullable: true })
  lastRun: Date;

  @Column({ name: 'next_run', type: 'timestamp', nullable: true })
  nextRun: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}

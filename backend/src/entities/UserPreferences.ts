// src/entities/UserPreferences.ts
// User preferences entity

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn
} from 'typeorm';
import { User } from './User';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', unique: true })
  userId: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Wygląd
  @Column({ type: 'varchar', length: 20, default: 'grover' })
  theme: string;

  // Powiadomienia
  @Column({ name: 'email_notifications', type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ name: 'push_notifications', type: 'boolean', default: false })
  pushNotifications: boolean;

  @Column({ name: 'notification_sound', type: 'boolean', default: true })
  notificationSound: boolean;

  // Bezpieczeństwo
  @Column({ name: 'two_factor_enabled', type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Column({ name: 'session_timeout', type: 'integer', default: 480 })
  sessionTimeout: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

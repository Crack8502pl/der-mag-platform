// src/entities/UserSessionLog.ts
// Encja logu sesji użytkownika — do monitorowania czasu pracy w systemie

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './User';

@Entity('user_sessions_log')
@Index(['userId'])
@Index(['tokenId'])
@Index(['loginAt'])
export class UserSessionLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'token_id', type: 'uuid' })
  tokenId: string;

  @CreateDateColumn({ name: 'login_at' })
  loginAt: Date;

  @Column({ name: 'logout_at', type: 'timestamp', nullable: true })
  logoutAt: Date | null;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds: number | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'logout_type', type: 'varchar', length: 20, nullable: true })
  logoutType: 'manual' | 'admin_forced' | 'token_expired' | 'token_reuse' | null;
}

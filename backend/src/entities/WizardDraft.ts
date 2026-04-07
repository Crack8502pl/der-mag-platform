// src/entities/WizardDraft.ts
// Encja przechowująca drafty wizardów (kreatora kontraktów, kreatora wysyłki, itp.)

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './User';

@Entity('wizard_drafts')
@Unique(['wizardType', 'userId'])
@Index(['userId', 'wizardType'])
@Index(['expiresAt'])
export class WizardDraft {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'wizard_type', type: 'varchar', length: 50 })
  wizardType: string;

  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'draft_data', type: 'jsonb' })
  draftData: Record<string, any>;

  @Column({ name: 'current_step', type: 'int', nullable: true })
  currentStep: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;
}

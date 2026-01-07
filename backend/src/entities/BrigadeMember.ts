// src/entities/BrigadeMember.ts
// Encja przypisania pracownika do brygady z harmonogramem

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Brigade } from './Brigade';
import { User } from './User';

@Entity('brigade_members')
export class BrigadeMember {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Brigade, (brigade) => brigade.members)
  @JoinColumn({ name: 'brigade_id' })
  brigade: Brigade;

  @Column({ name: 'brigade_id' })
  brigadeId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: number;

  // Dni tygodnia jako array
  // 1=Pon, 2=Wt, 3=Śr, 4=Czw, 5=Pt, 6=Sob, 7=Niedz
  @Column({ type: 'jsonb', default: [] })
  workDays: number[]; // [1,2,3,4,5] = Pon-Pt

  @Column({ name: 'valid_from', type: 'date' })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: Date;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

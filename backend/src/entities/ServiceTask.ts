// src/entities/ServiceTask.ts
// Encja zadania serwisowego

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Contract } from './Contract';
import { Subsystem } from './Subsystem';
import { Brigade } from './Brigade';
import { User } from './User';

export enum ServiceTaskVariant {
  REKLAMACJA = 'REKLAMACJA',
  GWARANCYJNY = 'GWARANCYJNY',
  POGWARANCYJNY = 'POGWARANCYJNY',
  BEZGWARANCYJNY = 'BEZGWARANCYJNY',
}

export enum ServiceTaskStatus {
  CREATED = 'created',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('service_tasks')
@Index(['taskNumber'], { unique: true })
export class ServiceTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_number', unique: true, length: 20 })
  taskNumber: string; // np. SRV-000001

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'variant',
  })
  variant: ServiceTaskVariant;

  @Column({ length: 50, default: ServiceTaskStatus.CREATED })
  status: ServiceTaskStatus;

  @ManyToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'contract_id', nullable: true })
  contractId: number;

  @ManyToOne(() => Subsystem, { nullable: true })
  @JoinColumn({ name: 'subsystem_id' })
  subsystem: Subsystem;

  @Column({ name: 'subsystem_id', nullable: true })
  subsystemId: number;

  @ManyToOne(() => Brigade, { nullable: true })
  @JoinColumn({ name: 'brigade_id' })
  brigade: Brigade;

  @Column({ name: 'brigade_id', nullable: true })
  brigadeId: number;

  @Column({ name: 'planned_start_date', type: 'date', nullable: true })
  plannedStartDate: Date;

  @Column({ name: 'planned_end_date', type: 'date', nullable: true })
  plannedEndDate: Date;

  @Column({ name: 'actual_start_date', type: 'timestamp', nullable: true })
  actualStartDate: Date;

  @Column({ name: 'actual_end_date', type: 'timestamp', nullable: true })
  actualEndDate: Date;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date;
}

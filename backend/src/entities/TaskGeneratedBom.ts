// src/entities/TaskGeneratedBom.ts
// Per-task BOM entity (Phase 1 infrastructure)

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { Subsystem } from './Subsystem';
import { BomSubsystemTemplate } from './BomSubsystemTemplate';
import { User } from './User';
import { TaskGeneratedBomItem } from './TaskGeneratedBomItem';

export enum TaskBomStatus {
  GENERATED = 'GENERATED',
  CONFIGURED = 'CONFIGURED',
  LOCKED = 'LOCKED'
}

@Entity('task_generated_boms')
@Index(['taskNumber'], { unique: true })
@Index(['subsystemId'])
export class TaskGeneratedBom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_number', type: 'varchar', length: 20, unique: true })
  taskNumber: string;

  @ManyToOne(() => Subsystem, { nullable: true })
  @JoinColumn({ name: 'subsystem_id' })
  subsystem: Subsystem;

  @Column({ name: 'subsystem_id', nullable: true })
  subsystemId: number;

  @ManyToOne(() => BomSubsystemTemplate, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: BomSubsystemTemplate;

  @Column({ name: 'template_id', nullable: true })
  templateId: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: TaskBomStatus.GENERATED
  })
  status: TaskBomStatus;

  @Column({ name: 'config_params', type: 'jsonb', default: {} })
  configParams: Record<string, any>;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'generated_by' })
  generatedBy: User;

  @Column({ name: 'generated_by', nullable: true })
  generatedById: number;

  @Column({ name: 'generated_at', type: 'timestamp', default: () => 'NOW()' })
  generatedAt: Date;

  @OneToMany(() => TaskGeneratedBomItem, item => item.taskBom, { cascade: true })
  items: TaskGeneratedBomItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

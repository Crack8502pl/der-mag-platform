// src/entities/Task.ts
// Encja zadania (główna encja systemu)

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { TaskType } from './TaskType';
import { TaskMaterial } from './TaskMaterial';
import { Device } from './Device';
import { TaskActivity } from './TaskActivity';
import { QualityPhoto } from './QualityPhoto';
import { TaskAssignment } from './TaskAssignment';
import { TaskMetric } from './TaskMetric';
import { Contract } from './Contract';
import { Subsystem } from './Subsystem';

@Entity('tasks')
@Index(['taskNumber'], { unique: true })
@Index(['status'])
@Index(['taskTypeId'])
@Index(['contractId'])
@Index(['subsystemId'])
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_number', type: 'varchar', length: 9, unique: true })
  taskNumber: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => TaskType, taskType => taskType.tasks)
  @JoinColumn({ name: 'task_type_id' })
  taskType: TaskType;

  @Column({ name: 'task_type_id' })
  taskTypeId: number;

  @Column({ length: 50, default: 'created' })
  status: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  client: string;

  @Column({ name: 'contract_number', type: 'varchar', length: 100, nullable: true })
  contractNumber: string;

  @Column({ name: 'parent_task_id', nullable: true })
  parentTaskId: number;

  @ManyToOne(() => Task, task => task.childTasks)
  @JoinColumn({ name: 'parent_task_id' })
  parentTask: Task;

  @OneToMany(() => Task, task => task.parentTask)
  childTasks: Task[];

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

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date;

  @OneToMany(() => TaskMaterial, material => material.task)
  materials: TaskMaterial[];

  @OneToMany(() => Device, device => device.task)
  devices: Device[];

  @OneToMany(() => TaskActivity, activity => activity.task)
  activities: TaskActivity[];

  @OneToMany(() => QualityPhoto, photo => photo.task)
  photos: QualityPhoto[];

  @OneToMany(() => TaskAssignment, assignment => assignment.task)
  assignments: TaskAssignment[];

  @OneToMany(() => TaskMetric, metric => metric.task)
  metrics: TaskMetric[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

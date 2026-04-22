// src/entities/TaskRelationship.ts
// Entity for storing parent-child relationships between subsystem tasks

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Subsystem } from './Subsystem';
import { SubsystemTask } from './SubsystemTask';

@Entity('task_relationships')
@Unique(['parentTaskId', 'childTaskId'])
@Index(['subsystemId'])
@Index(['parentTaskId'])
@Index(['childTaskId'])
export class TaskRelationship {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'subsystem_id', type: 'int' })
  subsystemId: number;

  @ManyToOne(() => Subsystem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subsystem_id' })
  subsystem: Subsystem;

  @Column({ name: 'parent_task_id', type: 'int' })
  parentTaskId: number;

  @ManyToOne(() => SubsystemTask, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask: SubsystemTask;

  @Column({ name: 'child_task_id', type: 'int' })
  childTaskId: number;

  @ManyToOne(() => SubsystemTask, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_task_id' })
  childTask: SubsystemTask;

  /** Type of the parent task (e.g. LCS, NASTAWNIA) */
  @Column({ name: 'parent_type', type: 'varchar', length: 50 })
  parentType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

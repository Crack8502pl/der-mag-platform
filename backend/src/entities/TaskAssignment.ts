// src/entities/TaskAssignment.ts
// Encja przypisania użytkownika do zadania

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Task } from './Task';
import { User } from './User';

@Entity('task_assignments')
@Index(['taskId', 'userId'], { unique: true })
export class TaskAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task, task => task.assignments)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'int', name: 'task_id' })
  taskId: number;

  @ManyToOne(() => User, user => user.taskAssignments)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', length: 50, default: 'assigned' })
  role: string;

  @Column({ name: 'assigned_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_by' })
  assignedBy: User;

  @Column({ type: 'int', name: 'assigned_by' })
  assignedById: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

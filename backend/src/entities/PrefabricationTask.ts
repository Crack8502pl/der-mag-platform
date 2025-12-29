// src/entities/PrefabricationTask.ts
// Encja zadania prefabrykacji

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { CompletionOrder } from './CompletionOrder';
import { Subsystem } from './Subsystem';
import { User } from './User';
import { PrefabricationDevice } from './PrefabricationDevice';

export enum PrefabricationTaskStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

@Entity('prefabrication_tasks')
export class PrefabricationTask {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CompletionOrder)
  @JoinColumn({ name: 'completion_order_id' })
  completionOrder: CompletionOrder;

  @Column({ name: 'completion_order_id' })
  completionOrderId: number;

  @ManyToOne(() => Subsystem)
  @JoinColumn({ name: 'subsystem_id' })
  subsystem: Subsystem;

  @Column({ name: 'subsystem_id' })
  subsystemId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User;

  @Column({ name: 'assigned_to' })
  assignedToId: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: PrefabricationTaskStatus.CREATED
  })
  status: PrefabricationTaskStatus;

  @Column({ name: 'ip_matrix_received', type: 'boolean', default: false })
  ipMatrixReceived: boolean;

  @Column({ name: 'materials_received', type: 'boolean', default: false })
  materialsReceived: boolean;

  @OneToMany(() => PrefabricationDevice, device => device.prefabTask)
  devices: PrefabricationDevice[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;
}

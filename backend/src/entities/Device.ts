// src/entities/Device.ts
// Encja urządzenia z numerem seryjnym

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Task } from './Task';

@Entity('devices')
@Index(['serialNumber'], { unique: true })
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, unique: true })
  serialNumber: string;

  @Column({ name: 'device_type', length: 100 })
  deviceType: string;

  @Column({ name: 'device_model', length: 100, nullable: true })
  deviceModel: string;

  @Column({ length: 100, nullable: true })
  manufacturer: string;

  @ManyToOne(() => Task, task => task.devices, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'task_id', nullable: true })
  taskId: number;

  @Column({ length: 50, default: 'prefabricated' })
  status: string;

  @Column({ name: 'prefabrication_date', type: 'timestamp', nullable: true })
  prefabricationDate: Date;

  @Column({ name: 'verification_date', type: 'timestamp', nullable: true })
  verificationDate: Date;

  @Column({ name: 'installation_date', type: 'timestamp', nullable: true })
  installationDate: Date;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// src/entities/IPPool.ts
// Encja puli adresów IP

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TaskType } from './TaskType';

@Entity('ip_pools')
@Index(['taskTypeId', 'cidr'])
export class IPPool {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TaskType, taskType => taskType.ipPools)
  @JoinColumn({ name: 'task_type_id' })
  taskType: TaskType;

  @Column({ type: 'int', name: 'task_type_id' })
  taskTypeId: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  cidr: string;

  @Column({ name: 'network_address', type: 'varchar', length: 45 })
  networkAddress: string;

  @Column({ name: 'subnet_mask', type: 'varchar', length: 45 })
  subnetMask: string;

  @Column({ name: 'first_ip', type: 'varchar', length: 45 })
  firstIp: string;

  @Column({ name: 'last_ip', type: 'varchar', length: 45 })
  lastIp: string;

  @Column({ name: 'total_addresses', type: 'int' })
  totalAddresses: number;

  @Column({ name: 'allocated_addresses', type: 'jsonb', default: [] })
  allocatedAddresses: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

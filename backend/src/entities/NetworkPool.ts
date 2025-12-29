// src/entities/NetworkPool.ts
// Encja puli adresów IP

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { NetworkAllocation } from './NetworkAllocation';

@Entity('network_pools')
export class NetworkPool {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'cidr_range', type: 'varchar', length: 20 })
  cidrRange: string; // np. 172.16.0.0/12

  @Column({ type: 'int', default: 1 })
  priority: number; // 1=główna, 2=backup, 3=specjalna

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => NetworkAllocation, allocation => allocation.pool)
  allocations: NetworkAllocation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

// src/entities/NetworkAllocation.ts
// Encja alokacji sieci dla podsystemu

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { Contract } from './Contract';
import { Subsystem } from './Subsystem';
import { NetworkPool } from './NetworkPool';
import { DeviceIPAssignment } from './DeviceIPAssignment';

@Entity('network_allocations')
export class NetworkAllocation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Contract)
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'contract_id' })
  contractId: number;

  @OneToOne(() => Subsystem, subsystem => subsystem.networkAllocation)
  @JoinColumn({ name: 'subsystem_id' })
  subsystem: Subsystem;

  @Column({ name: 'subsystem_id' })
  subsystemId: number;

  @ManyToOne(() => NetworkPool, pool => pool.allocations)
  @JoinColumn({ name: 'pool_id' })
  pool: NetworkPool;

  @Column({ name: 'pool_id' })
  poolId: number;

  @Column({ name: 'system_type', type: 'varchar', length: 50 })
  systemType: string;

  @Column({ name: 'allocated_range', type: 'varchar', length: 20 })
  allocatedRange: string; // cidr, np. 172.16.1.0/24

  @Column({ type: 'inet' })
  gateway: string;

  @Column({ name: 'subnet_mask', type: 'inet' })
  subnetMask: string;

  @Column({ name: 'ntp_server', type: 'inet' })
  ntpServer: string;

  @Column({ name: 'first_usable_ip', type: 'inet' })
  firstUsableIP: string;

  @Column({ name: 'last_usable_ip', type: 'inet' })
  lastUsableIP: string;

  @Column({ name: 'total_hosts', type: 'int' })
  totalHosts: number;

  @Column({ name: 'used_hosts', type: 'int', default: 0 })
  usedHosts: number;

  @OneToMany(() => DeviceIPAssignment, assignment => assignment.allocation)
  deviceAssignments: DeviceIPAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

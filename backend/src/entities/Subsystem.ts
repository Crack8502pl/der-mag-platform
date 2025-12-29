// src/entities/Subsystem.ts
// Encja podsystemu

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToOne, Index } from 'typeorm';
import { Contract } from './Contract';
import { NetworkAllocation } from './NetworkAllocation';

export enum SystemType {
  SMW = 'SMW',
  CSDIP = 'CSDIP',
  LAN_PKP_PLK = 'LAN_PKP_PLK',
  SMOKIP_A = 'SMOKIP_A',
  SMOKIP_B = 'SMOKIP_B',
  CMOKIP_A = 'CMOKIP_A',
  CMOKIP_B = 'CMOKIP_B',
  SSWIN = 'SSWIN',
  SSP = 'SSP',
  SUG = 'SUG',
  LAN_STRUKTURALNY = 'LAN_STRUKTURALNY',
  ZASILANIA = 'ZASILANIA',
  SWIATOWODY = 'SWIATOWODY',
  OBIEKTY_KUBATUROWE = 'OBIEKTY_KUBATUROWE',
  KONTRAKTY_LINIOWE = 'KONTRAKTY_LINIOWE'
}

export enum SubsystemStatus {
  CREATED = 'CREATED',
  BOM_GENERATED = 'BOM_GENERATED',
  IP_ALLOCATED = 'IP_ALLOCATED',
  IN_COMPLETION = 'IN_COMPLETION',
  IN_PREFABRICATION = 'IN_PREFABRICATION',
  READY_FOR_DEPLOYMENT = 'READY_FOR_DEPLOYMENT',
  DEPLOYED = 'DEPLOYED'
}

@Entity('subsystems')
@Index(['subsystemNumber'], { unique: true })
export class Subsystem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'subsystem_number', type: 'varchar', length: 11, unique: true })
  subsystemNumber: string; // Format: PXXXXXYYZZ

  @Column({
    name: 'system_type',
    type: 'varchar',
    length: 50
  })
  systemType: SystemType;

  @Column({ type: 'int', default: 1 })
  quantity: number; // Ilość wystąpień

  @ManyToOne(() => Contract, contract => contract.subsystems)
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'contract_id' })
  contractId: number;

  @OneToOne(() => NetworkAllocation, allocation => allocation.subsystem, { nullable: true })
  networkAllocation: NetworkAllocation;

  @Column({
    type: 'varchar',
    length: 30,
    default: SubsystemStatus.CREATED
  })
  status: SubsystemStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

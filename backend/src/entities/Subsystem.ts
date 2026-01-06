// src/entities/Subsystem.ts
// Encja podsystemu

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToOne, Index } from 'typeorm';
import { Contract } from './Contract';
import { NetworkAllocation } from './NetworkAllocation';

export enum SystemType {
  SMOKIP_A = 'SMOKIP_A',       // 1. SMOK/CMOKIP-A
  SMOKIP_B = 'SMOKIP_B',       // 2. SMOK/CMOKIP-B
  SKD = 'SKD',                 // 3. SKD-System Kontroli Dostępu
  SSWIN = 'SSWIN',             // 4. SSWiN-System Sygnalizacji Włamania i Napadu
  CCTV = 'CCTV',               // 5. CCTV-System Telewizji Przemysłowej
  SMW = 'SMW',                 // 6. SMW-System Monitoringu Wizyjnego
  SDIP = 'SDIP',               // 7. SDIP-System Dynamicznej Informacji Pasażerskiej
  SUG = 'SUG',                 // 8. SUG-Stałe Urządzenia Gaśnicze
  SSP = 'SSP',                 // 9. SSP-System Stwierdzenia Pożaru
  LAN = 'LAN',                 // 10. Okablowanie LAN
  OTK = 'OTK',                 // 11. Okablowanie OTK
  ZASILANIE = 'ZASILANIE'      // 12. Zasilanie
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

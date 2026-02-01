// src/entities/Contract.ts
// Encja kontraktu

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { User } from './User';
import { Subsystem } from './Subsystem';

export enum ContractStatus {
  CREATED = 'CREATED',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

@Entity('contracts')
@Index(['contractNumber'], { unique: true })
export class Contract {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'contract_number', type: 'varchar', length: 20, unique: true })
  contractNumber: string; // Format: RXXXXXXX_Y (Y = litera A-Z)

  @Column({ name: 'custom_name', type: 'varchar', length: 200 })
  customName: string;

  @Column({ name: 'order_date', type: 'date' })
  orderDate: Date;

  @Column({ name: 'manager_code', type: 'varchar', length: 5 })
  managerCode: string; // Kod kierownika (do 5 znaków)

  @Column({ name: 'jowisz_ref', type: 'varchar', length: 100, nullable: true })
  jowiszRef: string; // Referencja API Jowisz

  @Column({ name: 'linia_kolejowa', type: 'varchar', length: 20, nullable: true })
  liniaKolejowa: string; // Format: LK-221, E-20 (opcjonalne)

  @ManyToOne(() => User)
  @JoinColumn({ name: 'project_manager_id' })
  projectManager: User;

  @Column({ name: 'project_manager_id' })
  projectManagerId: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: ContractStatus.CREATED
  })
  status: ContractStatus;

  @OneToMany(() => Subsystem, subsystem => subsystem.contract)
  subsystems: Subsystem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

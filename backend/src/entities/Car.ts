// src/entities/Car.ts
// Encja samochodu firmowego zsynchronizowanego z Symfonii

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cars')
export class Car {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'symfonia_lp', length: 20, unique: true })
  symfoniaLp: string; // np. S00144

  @Column({ type: 'varchar', length: 20 })
  registration: string; // nr rejestracyjny uppercase np. CB144RX

  @Column({ name: 'symfonia_element_id', nullable: true, type: 'int' })
  symfoniaElementId: number | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'brigade_id', nullable: true, type: 'int' })
  brigadeId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt: Date | null;
}

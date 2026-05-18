import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { RailwayStation } from './RailwayStation.entity';

@Entity('railway_lines')
export class RailwayLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true, length: 20 })
  @Index()
  code: string; // np. "LK-1", "E-20", "LK-221"

  @Column({ type: 'varchar', length: 200 })
  name: string; // np. "Warszawa Centralna - Katowice"

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true, name: 'length_km' })
  lengthKm: number | null; // całkowita długość linii w km

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true, name: 'km_from' })
  kmFrom: number | null; // km początkowy

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true, name: 'km_to' })
  kmTo: number | null; // km końcowy

  @Column({ type: 'varchar', nullable: true })
  manager: string; // zarządca, domyślnie "PKP PLK S.A."

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @OneToMany(() => RailwayStation, station => station.line)
  stations: RailwayStation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

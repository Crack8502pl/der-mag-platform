import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { RailwayLine } from './RailwayLine.entity';

export type StationType = 'stacja' | 'posterunek' | 'LCS' | 'nastawnia' | 'przystanek' | 'inne';

@Entity('railway_stations')
@Index(['lineCode', 'kmPosition'])
export class RailwayStation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  name: string; // np. "Warszawa Centralna"

  @Column({ type: 'varchar', nullable: true, length: 20 })
  code: string | null; // kod posterunku np. "WAWA", "KRKW"

  @Column({ type: 'varchar', name: 'line_code', length: 20 })
  @Index()
  lineCode: string; // FK logiczne do RailwayLine.code

  @ManyToOne(() => RailwayLine, line => line.stations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'line_id' })
  line: RailwayLine;

  @Column({ type: 'int', name: 'line_id', nullable: true })
  lineId: number | null;

  @Column({ type: 'varchar', length: 30, default: 'stacja' })
  type: StationType;

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true, name: 'km_position' })
  kmPosition: number | null; // pozycja kilometryczna na linii

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  municipality: string | null; // miejscowość

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

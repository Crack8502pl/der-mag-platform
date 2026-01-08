// src/entities/WarehouseLocation.ts
// Lokalizacje magazynowe

import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index
} from 'typeorm';

export enum LocationType {
  WAREHOUSE = 'WAREHOUSE',
  STORAGE_ROOM = 'STORAGE_ROOM',
  VEHICLE = 'VEHICLE',
  EXTERNAL = 'EXTERNAL'
}

@Entity('warehouse_locations')
@Index(['locationCode'], { unique: true })
export class WarehouseLocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'location_code', length: 50, unique: true })
  locationCode: string;

  @Column({ name: 'location_name', length: 200 })
  locationName: string;

  @Column({ length: 100, nullable: true })
  zone: string;

  @Column({ length: 50, nullable: true })
  aisle: string;

  @Column({ length: 50, nullable: true })
  rack: string;

  @Column({ length: 50, nullable: true })
  shelf: string;

  @Column({ length: 50, nullable: true })
  bin: string;

  // Parametry lokalizacji
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  capacity: number;

  @Column({ name: 'current_usage', type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentUsage: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({
    name: 'location_type',
    type: 'varchar',
    length: 50,
    nullable: true
  })
  locationType: LocationType;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Audyt
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

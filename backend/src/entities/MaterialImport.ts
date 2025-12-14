// src/entities/MaterialImport.ts
// Encja importu materiałów z CSV

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './User';

@Entity('material_imports')
@Index(['status'])
@Index(['importedBy'])
export class MaterialImport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ length: 255 })
  filename: string;

  @Column({ 
    type: 'varchar', 
    length: 20,
    comment: 'pending | preview | confirmed | completed | cancelled'
  })
  status: string;

  @Column({ name: 'total_rows', default: 0 })
  totalRows: number;

  @Column({ name: 'new_items', default: 0 })
  newItems: number;

  @Column({ name: 'existing_items', default: 0 })
  existingItems: number;

  @Column({ name: 'error_items', default: 0 })
  errorItems: number;

  @Column({ 
    type: 'jsonb', 
    nullable: true,
    name: 'diff_preview',
    comment: 'Podział na: new, existing, errors'
  })
  diffPreview?: Record<string, any>;

  @Column({ 
    type: 'jsonb', 
    nullable: true,
    name: 'imported_ids',
    comment: 'ID dodanych materiałów'
  })
  importedIds?: number[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'imported_by' })
  importedBy?: User;

  @Column({ name: 'imported_by', nullable: true })
  importedById?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt?: Date;
}

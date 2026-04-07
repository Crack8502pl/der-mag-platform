// src/entities/SubsystemDocument.ts
// Encja dokumentów podsystemu

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Subsystem } from './Subsystem';
import { User } from './User';

@Entity('subsystem_documents')
export class SubsystemDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Subsystem)
  @JoinColumn({ name: 'subsystem_id' })
  subsystem: Subsystem;

  @Column({ type: 'int', name: 'subsystem_id' })
  subsystemId: number;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ type: 'text' })
  filePath: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ type: 'int', name: 'uploaded_by' })
  uploadedById: number;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}

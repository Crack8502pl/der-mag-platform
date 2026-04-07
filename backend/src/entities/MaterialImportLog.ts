// src/entities/MaterialImportLog.ts
// Encja logów importu materiałów

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial'
}

@Entity('material_import_logs')
export class MaterialImportLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'file_name', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', name: 'file_type', length: 20 })
  fileType: string;

  @Column({ type: 'int', name: 'file_size' })
  fileSize: number;

  @Column({
    type: 'enum',
    enum: ImportStatus,
    default: ImportStatus.PENDING
  })
  status: ImportStatus;

  @Column({ type: 'int', name: 'total_rows', default: 0 })
  totalRows: number;

  @Column({ type: 'int', name: 'imported_rows', default: 0 })
  importedRows: number;

  @Column({ type: 'int', name: 'updated_rows', default: 0 })
  updatedRows: number;

  @Column({ type: 'int', name: 'skipped_rows', default: 0 })
  skippedRows: number;

  @Column({ type: 'int', name: 'error_rows', default: 0 })
  errorRows: number;

  @Column({ type: 'jsonb', nullable: true })
  errors: Array<{ row: number; field: string; value: string; message: string }>;

  @Column({ type: 'jsonb', nullable: true })
  columnMapping: Record<string, string>;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'imported_by' })
  importedBy: User;

  @Column({ type: 'timestamp', name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

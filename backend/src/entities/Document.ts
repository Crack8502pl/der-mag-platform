// src/entities/Document.ts
// Encja dokumentu

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Task } from './Task';
import { User } from './User';
import { DocumentTemplate } from './DocumentTemplate';

@Entity('documents')
@Index(['taskId'])
@Index(['category'])
@Index(['createdBy'])
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
  uuid: string;

  @ManyToOne(() => Task, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Column({ type: 'int', name: 'task_id', nullable: true })
  taskId?: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ 
    type: 'varchar', 
    length: 20,
    comment: 'uploaded | generated'
  })
  type: string;

  @Column({ 
    type: 'varchar', 
    length: 50,
    comment: 'invoice | protocol | report | bom_list | other'
  })
  category: string;

  @Column({ type: 'varchar', name: 'file_path', length: 500 })
  filePath: string;

  @Column({ type: 'int', name: 'file_size' })
  fileSize: number;

  @Column({ type: 'varchar', name: 'mime_type', length: 100 })
  mimeType: string;

  @Column({ type: 'varchar', name: 'original_filename', length: 255 })
  originalFilename: string;

  @ManyToOne(() => DocumentTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'generated_from_template_id' })
  generatedFromTemplate?: DocumentTemplate;

  @Column({ type: 'int', name: 'generated_from_template_id', nullable: true })
  generatedFromTemplateId?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;

  @Column({ type: 'int', name: 'created_by', nullable: true })
  createdById?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

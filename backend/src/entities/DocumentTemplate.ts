// src/entities/DocumentTemplate.ts
// Encja szablonu dokumentu

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TaskType } from './TaskType';

@Entity('document_templates')
@Index(['taskTypeId'])
@Index(['active'])
export class DocumentTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ 
    type: 'varchar', 
    length: 20,
    comment: 'word | excel | pdf'
  })
  type: string;

  @Column({ name: 'file_path', length: 500 })
  filePath: string;

  @Column({ 
    type: 'jsonb', 
    nullable: true,
    comment: 'Lista pól do wypełnienia, np. {taskNumber}, {clientName}'
  })
  placeholders?: Record<string, any>;

  @ManyToOne(() => TaskType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_type_id' })
  taskType?: TaskType;

  @Column({ name: 'task_type_id', nullable: true })
  taskTypeId?: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// src/entities/WorkflowGeneratedBom.ts
// Encja wygenerowanego BOM dla podsystemu workflow

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Subsystem } from './Subsystem';
import { WorkflowBomTemplate } from './WorkflowBomTemplate';
import { WorkflowGeneratedBomItem } from './WorkflowGeneratedBomItem';

export enum WorkflowGeneratedBomStatus {
  GENERATED = 'GENERATED',
  SENT_TO_COMPLETION = 'SENT_TO_COMPLETION',
  IN_COMPLETION = 'IN_COMPLETION',
  COMPLETED = 'COMPLETED'
}

@Entity('workflow_generated_boms')
export class WorkflowGeneratedBom {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Subsystem)
  @JoinColumn({ name: 'subsystem_id' })
  subsystem: Subsystem;

  @Column({ name: 'subsystem_id' })
  subsystemId: number;

  @ManyToOne(() => WorkflowBomTemplate)
  @JoinColumn({ name: 'template_id' })
  template: WorkflowBomTemplate;

  @Column({ name: 'template_id' })
  templateId: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: WorkflowGeneratedBomStatus.GENERATED
  })
  status: WorkflowGeneratedBomStatus;

  @OneToMany(() => WorkflowGeneratedBomItem, item => item.generatedBom)
  items: WorkflowGeneratedBomItem[];

  @Column({ name: 'generated_by', type: 'int' })
  generatedBy: number; // user id

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt: Date;
}

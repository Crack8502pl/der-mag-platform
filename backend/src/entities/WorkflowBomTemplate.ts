// src/entities/WorkflowBomTemplate.ts
// Encja szablonu BOM dla workflow kontraktowego (Bill of Materials)

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { WorkflowBomTemplateItem } from './WorkflowBomTemplateItem';

@Entity('workflow_bom_templates')
@Index(['templateCode'], { unique: true })
export class WorkflowBomTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_code', type: 'varchar', length: 50, unique: true })
  templateCode: string; // np. BOM_template_SMW

  @Column({ name: 'system_type', type: 'varchar', length: 50 })
  systemType: string; // Powiązanie z SubsystemType

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 1 })
  version: number;

  @OneToMany(() => WorkflowBomTemplateItem, item => item.template)
  items: WorkflowBomTemplateItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

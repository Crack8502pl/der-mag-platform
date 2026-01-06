// src/entities/WorkflowBomTemplateItem.ts
// Encja pozycji w szablonie BOM workflow

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WorkflowBomTemplate } from './WorkflowBomTemplate';
import { DeviceCategory } from './DeviceIPAssignment';

@Entity('workflow_bom_template_items')
export class WorkflowBomTemplateItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => WorkflowBomTemplate, template => template.items)
  @JoinColumn({ name: 'template_id' })
  template: WorkflowBomTemplate;

  @Column({ name: 'template_id' })
  templateId: number;

  @Column({ name: 'part_number', type: 'varchar', length: 100, nullable: true })
  partNumber: string;

  @Column({ name: 'item_name', type: 'varchar', length: 200 })
  itemName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: 'szt' })
  unit: string; // szt, m, kg, etc.

  @Column({ name: 'requires_ip', type: 'boolean', default: false })
  requiresIp: boolean;

  @Column({ name: 'device_category', type: 'varchar', length: 20, nullable: true })
  deviceCategory: DeviceCategory;

  @Column({ name: 'requires_serial_number', type: 'boolean', default: false })
  requiresSerialNumber: boolean;

  @Column({ type: 'int', default: 1 })
  sequence: number;

  @Column({ name: 'estimated_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedPrice: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  supplier: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

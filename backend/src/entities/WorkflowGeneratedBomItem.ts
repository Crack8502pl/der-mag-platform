// src/entities/WorkflowGeneratedBomItem.ts
// Encja pozycji w wygenerowanym BOM workflow

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { WorkflowGeneratedBom } from './WorkflowGeneratedBom';
import { WorkflowBomTemplateItem } from './WorkflowBomTemplateItem';

export enum WorkflowGeneratedBomItemStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  MISSING = 'MISSING',
  PARTIAL = 'PARTIAL'
}

@Entity('workflow_generated_bom_items')
export class WorkflowGeneratedBomItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => WorkflowGeneratedBom, bom => bom.items)
  @JoinColumn({ name: 'generated_bom_id' })
  generatedBom: WorkflowGeneratedBom;

  @Column({ name: 'generated_bom_id' })
  generatedBomId: number;

  @ManyToOne(() => WorkflowBomTemplateItem)
  @JoinColumn({ name: 'template_item_id' })
  templateItem: WorkflowBomTemplateItem;

  @Column({ name: 'template_item_id' })
  templateItemId: number;

  @Column({ name: 'item_name', type: 'varchar', length: 200 })
  itemName: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: 'szt' })
  unit: string;

  @Column({ name: 'part_number', type: 'varchar', length: 100, nullable: true })
  partNumber: string;

  @Column({ name: 'requires_ip', type: 'boolean', default: false })
  requiresIp: boolean;

  @Column({ name: 'device_category', type: 'varchar', length: 20, nullable: true })
  deviceCategory: string;

  @Column({ type: 'int', default: 1 })
  sequence: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: WorkflowGeneratedBomItemStatus.PENDING
  })
  status: WorkflowGeneratedBomItemStatus;

  @Column({ name: 'scanned_quantity', type: 'int', default: 0 })
  scannedQuantity: number;

  @Column({ name: 'missing_quantity', type: 'int', default: 0 })
  missingQuantity: number;
}

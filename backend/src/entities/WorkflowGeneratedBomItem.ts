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

  @Column({ type: 'int' })
  quantity: number;

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

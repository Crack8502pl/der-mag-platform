// src/entities/WarehouseStockWorkflowBomMapping.ts
// Mapowanie warehouse_stock -> workflow_bom_template_items

import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { WarehouseStock } from './WarehouseStock';
import { WorkflowBomTemplateItem } from './WorkflowBomTemplateItem';
import { User } from './User';

@Entity('warehouse_stock_workflow_bom_mapping')
@Index(['warehouseStockId', 'workflowBomTemplateItemId'], { unique: true })
export class WarehouseStockWorkflowBomMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => WarehouseStock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_stock_id' })
  warehouseStock: WarehouseStock;

  @Column({ name: 'warehouse_stock_id' })
  warehouseStockId: number;

  @ManyToOne(() => WorkflowBomTemplateItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflow_bom_template_item_id' })
  workflowBomTemplateItem: WorkflowBomTemplateItem;

  @Column({ name: 'workflow_bom_template_item_id' })
  workflowBomTemplateItemId: number;

  // Parametry mapowania
  @Column({ name: 'quantity_per_unit', type: 'decimal', precision: 10, scale: 2, default: 1 })
  quantityPerUnit: number;

  @Column({ name: 'is_optional', default: false })
  isOptional: boolean;

  @Column({ name: 'is_alternative', default: false })
  isAlternative: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Audyt
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// src/entities/WarehouseStockBomMapping.ts
// Mapowanie warehouse_stock -> bom_templates

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
import { BOMTemplate } from './BOMTemplate';
import { User } from './User';

@Entity('warehouse_stock_bom_mapping')
@Index(['warehouseStockId', 'bomTemplateId'], { unique: true })
export class WarehouseStockBomMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => WarehouseStock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_stock_id' })
  warehouseStock: WarehouseStock;

  @Column({ name: 'warehouse_stock_id' })
  warehouseStockId: number;

  @ManyToOne(() => BOMTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bom_template_id' })
  bomTemplate: BOMTemplate;

  @Column({ name: 'bom_template_id' })
  bomTemplateId: number;

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

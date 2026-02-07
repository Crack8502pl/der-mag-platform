// src/entities/BomSubsystemTemplateItem.ts
// Entity for BOM subsystem template items

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
import { BomSubsystemTemplate } from './BomSubsystemTemplate';
import { WarehouseStock } from './WarehouseStock';

export enum QuantitySource {
  FIXED = 'FIXED',             // Fixed quantity
  FROM_CONFIG = 'FROM_CONFIG', // From subsystem configuration parameters
  PER_UNIT = 'PER_UNIT',       // Multiplied by number of units
  DEPENDENT = 'DEPENDENT'      // Calculated based on another item
}

@Entity('bom_subsystem_template_items')
@Index(['templateId'])
@Index(['warehouseStockId'])
export class BomSubsystemTemplateItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => BomSubsystemTemplate, template => template.items, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'template_id' })
  template: BomSubsystemTemplate;

  @Column({ name: 'template_id' })
  templateId: number;

  @ManyToOne(() => WarehouseStock, { nullable: true })
  @JoinColumn({ name: 'warehouse_stock_id' })
  warehouseStock: WarehouseStock;

  @Column({ name: 'warehouse_stock_id', nullable: true })
  warehouseStockId: number | null;

  @Column({ name: 'material_name', type: 'varchar', length: 200 })
  materialName: string;

  @Column({ name: 'catalog_number', type: 'varchar', length: 100, nullable: true })
  catalogNumber: string | undefined;

  @Column({ type: 'varchar', length: 50, default: 'szt' })
  unit: string;

  @Column({ name: 'default_quantity', type: 'decimal', precision: 10, scale: 2, default: 1 })
  defaultQuantity: number;

  @Column({
    name: 'quantity_source',
    type: 'varchar',
    length: 50,
    default: QuantitySource.FIXED
  })
  quantitySource: QuantitySource;

  @Column({ name: 'config_param_name', type: 'varchar', length: 100, nullable: true })
  configParamName: string | null | undefined;

  @ManyToOne(() => BomSubsystemTemplateItem, { nullable: true })
  @JoinColumn({ name: 'depends_on_item_id' })
  dependsOnItem: BomSubsystemTemplateItem;

  @Column({ name: 'depends_on_item_id', nullable: true })
  dependsOnItemId: number | null | undefined;

  @Column({ name: 'dependency_formula', type: 'varchar', length: 200, nullable: true })
  dependencyFormula: string | null | undefined;

  @Column({ name: 'requires_ip', type: 'boolean', default: false })
  requiresIp: boolean;

  @Column({ name: 'is_required', type: 'boolean', default: true })
  isRequired: boolean;

  @Column({ name: 'group_name', type: 'varchar', length: 100, nullable: true })
  groupName: string | undefined;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ type: 'text', nullable: true })
  notes: string | undefined;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

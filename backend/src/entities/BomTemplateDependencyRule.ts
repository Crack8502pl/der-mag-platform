// src/entities/BomTemplateDependencyRule.ts
// Entity for BOM template dependency rules

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { BomSubsystemTemplate } from './BomSubsystemTemplate';
import { BomSubsystemTemplateItem } from './BomSubsystemTemplateItem';
import { BomTemplateDependencyRuleInput } from './BomTemplateDependencyRuleInput';
import { BomTemplateDependencyRuleCondition } from './BomTemplateDependencyRuleCondition';

export enum AggregationType {
  SUM = 'SUM',
  COUNT = 'COUNT',
  MIN = 'MIN',
  MAX = 'MAX',
  PRODUCT = 'PRODUCT',
  FIRST = 'FIRST',
  SELECT_RECORDER = 'SELECT_RECORDER',
  SELECT_DISKS = 'SELECT_DISKS'
}

export enum MathOperation {
  NONE = 'NONE',
  FLOOR_DIV = 'FLOOR_DIV',
  MODULO = 'MODULO',
  ADD = 'ADD',
  SUBTRACT = 'SUBTRACT',
  MULTIPLY = 'MULTIPLY',
  CEIL_DIV = 'CEIL_DIV',
  ROUND_DIV = 'ROUND_DIV',
  CALCULATE_STORAGE = 'CALCULATE_STORAGE'
}

@Entity('bom_template_dependency_rules')
@Index(['templateId'])
@Index(['targetItemId'])
@Index(['evaluationOrder'])
@Index(['isActive'])
export class BomTemplateDependencyRule {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => BomSubsystemTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: BomSubsystemTemplate;

  @Column({ name: 'template_id' })
  templateId: number;

  @Column({ name: 'rule_name', type: 'varchar', length: 200 })
  ruleName: string;

  @Column({ name: 'rule_code', type: 'varchar', length: 100, nullable: true })
  ruleCode: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'evaluation_order', type: 'integer', default: 0 })
  evaluationOrder: number;

  @Column({
    name: 'aggregation_type',
    type: 'varchar',
    length: 30,
    default: AggregationType.SUM
  })
  aggregationType: AggregationType;

  @Column({
    name: 'math_operation',
    type: 'varchar',
    length: 30,
    default: MathOperation.NONE
  })
  mathOperation: MathOperation;

  @Column({ name: 'math_operand', type: 'decimal', precision: 10, scale: 2, nullable: true })
  mathOperand: number | null;

  @ManyToOne(() => BomSubsystemTemplateItem)
  @JoinColumn({ name: 'target_item_id' })
  targetItem: BomSubsystemTemplateItem;

  @Column({ name: 'target_item_id' })
  targetItemId: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'target_warehouse_category', type: 'varchar', length: 100, nullable: true })
  targetWarehouseCategory: string | null;

  @Column({ name: 'selection_criteria', type: 'jsonb', nullable: true })
  selectionCriteria: Record<string, unknown> | null;

  @Column({ name: 'storage_days_param', type: 'varchar', length: 100, nullable: true })
  storageDaysParam: string | null;

  @Column({ name: 'storage_bitrate_mbps', type: 'decimal', precision: 5, scale: 2, default: 4.0 })
  storageBitrateMbps: number;

  @OneToMany(() => BomTemplateDependencyRuleInput, input => input.rule, {
    cascade: true
  })
  inputs: BomTemplateDependencyRuleInput[];

  @OneToMany(() => BomTemplateDependencyRuleCondition, condition => condition.rule, {
    cascade: true
  })
  conditions: BomTemplateDependencyRuleCondition[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

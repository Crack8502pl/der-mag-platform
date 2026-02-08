// src/entities/BomTemplateDependencyRuleCondition.ts
// Entity for BOM template dependency rule conditions

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { BomTemplateDependencyRule } from './BomTemplateDependencyRule';

export enum ComparisonOperator {
  GT = '>',
  LT = '<',
  GTE = '>=',
  LTE = '<=',
  EQ = '==',
  NEQ = '!=',
  BETWEEN = 'BETWEEN'
}

@Entity('bom_template_dependency_rule_conditions')
@Index(['ruleId'])
@Index(['conditionOrder'])
export class BomTemplateDependencyRuleCondition {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => BomTemplateDependencyRule, rule => rule.conditions, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'rule_id' })
  rule: BomTemplateDependencyRule;

  @Column({ name: 'rule_id' })
  ruleId: number;

  @Column({ name: 'condition_order', type: 'integer', default: 0 })
  conditionOrder: number;

  @Column({ name: 'comparison_operator', type: 'varchar', length: 10 })
  comparisonOperator: ComparisonOperator;

  @Column({ name: 'compare_value', type: 'decimal', precision: 10, scale: 2 })
  compareValue: number;

  @Column({ name: 'compare_value_max', type: 'decimal', precision: 10, scale: 2, nullable: true })
  compareValueMax: number | null;

  @Column({ name: 'result_value', type: 'decimal', precision: 10, scale: 2 })
  resultValue: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string | null;
}

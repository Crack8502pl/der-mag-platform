// src/entities/BomTemplateDependencyRuleInput.ts
// Entity for BOM template dependency rule inputs

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { BomTemplateDependencyRule } from './BomTemplateDependencyRule';
import { BomSubsystemTemplateItem } from './BomSubsystemTemplateItem';

export enum InputType {
  ITEM = 'ITEM',
  RULE_RESULT = 'RULE_RESULT'
}

@Entity('bom_template_dependency_rule_inputs')
@Index(['ruleId'])
@Index(['sourceItemId'])
@Index(['sourceRuleId'])
export class BomTemplateDependencyRuleInput {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => BomTemplateDependencyRule, rule => rule.inputs, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'rule_id' })
  rule: BomTemplateDependencyRule;

  @Column({ name: 'rule_id' })
  ruleId: number;

  @Column({
    name: 'input_type',
    type: 'varchar',
    length: 20,
    default: InputType.ITEM
  })
  inputType: InputType;

  @ManyToOne(() => BomSubsystemTemplateItem, { nullable: true })
  @JoinColumn({ name: 'source_item_id' })
  sourceItem: BomSubsystemTemplateItem | null;

  @Column({ name: 'source_item_id', nullable: true })
  sourceItemId: number | null;

  @ManyToOne(() => BomTemplateDependencyRule, { nullable: true })
  @JoinColumn({ name: 'source_rule_id' })
  sourceRule: BomTemplateDependencyRule | null;

  @Column({ name: 'source_rule_id', nullable: true })
  sourceRuleId: number | null;

  @Column({ name: 'only_if_selected', type: 'boolean', default: true })
  onlyIfSelected: boolean;

  @Column({ name: 'input_multiplier', type: 'decimal', precision: 10, scale: 2, default: 1 })
  inputMultiplier: number;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;
}

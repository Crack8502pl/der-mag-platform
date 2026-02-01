// src/entities/BomDependencyRule.ts
// Encja dla reguł zależności BOM

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface DependencyCondition {
  materialCategory: string;        // np. "CAMERA", "NVR", "SWITCH"
  field: 'quantity' | 'exists';
  operator: '>' | '>=' | '=' | '<' | '<=' | 'exists';
  value: number | boolean;
}

export interface DependencyAction {
  targetMaterialCategory: string;
  field: 'minQuantity' | 'minPorts' | 'required' | 'suggested';
  formula: string;                 // np. "cameras + nvr + 1"
  message?: string;
}

@Entity('bom_dependency_rules')
export class BomDependencyRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  conditions: DependencyCondition[];

  @Column({ name: 'condition_operator', type: 'varchar', length: 10, default: 'AND' })
  conditionOperator: 'AND' | 'OR';

  @Column({ type: 'jsonb' })
  actions: DependencyAction[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string;  // PRZEJAZD_KAT_A, PRZEJAZD_KAT_E, SKP, NASTAWNIA, etc.

  @Column({ name: 'system_type', type: 'varchar', length: 50, nullable: true })
  systemType: string;  // SMOKIP_A, SMOKIP_B, etc.

  @Column({ default: 10 })
  priority: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// src/modules/workflow/entities/WorkflowTransition.ts
// Reguła przejścia między etapami. Bez reguły etapy idą po kolei (sort_order).

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('workflow_transitions')
export class WorkflowTransition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_id', type: 'int' })
  versionId: number;

  @Column({ name: 'from_step_key', type: 'varchar', length: 100 })
  fromStepKey: string;

  @Column({ name: 'to_step_key', type: 'varchar', length: 100 })
  toStepKey: string;

  /** Warunek w formacie FormRules liczony na odpowiedziach formularza etapu źródłowego; null = zawsze. */
  @Column({ type: 'jsonb', nullable: true })
  condition: Record<string, unknown> | null;

  /** Kolejność sprawdzania reguł z jednego etapu (mniejsza liczba = wcześniej). */
  @Column({ type: 'int', default: 0 })
  priority: number;
}

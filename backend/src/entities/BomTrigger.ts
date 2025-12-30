// src/entities/BomTrigger.ts
// Encja triggera/automatycznej akcji BOM

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TaskType } from './TaskType';
import { User } from './User';

export type TriggerEvent = 'ON_TASK_CREATE' | 'ON_STATUS_CHANGE' | 'ON_BOM_UPDATE' | 'ON_MATERIAL_ADD' | 'ON_QUANTITY_CHANGE';
export type ActionType = 'ADD_MATERIAL' | 'UPDATE_QUANTITY' | 'COPY_BOM' | 'NOTIFY' | 'CALCULATE_COST';

@Entity('bom_triggers')
@Index(['triggerEvent'])
@Index(['isActive'])
@Index(['priority'])
export class BomTrigger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, nullable: true, default: () => 'gen_random_uuid()' })
  uuid?: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'trigger_event', type: 'varchar', length: 50 })
  triggerEvent: TriggerEvent;

  @Column({ name: 'trigger_condition', type: 'jsonb', default: {} })
  triggerCondition: Record<string, any>;

  @Column({ name: 'action_type', type: 'varchar', length: 50 })
  actionType: ActionType;

  @Column({ name: 'action_config', type: 'jsonb', default: {} })
  actionConfig: Record<string, any>;

  @ManyToOne(() => TaskType, { nullable: true })
  @JoinColumn({ name: 'source_task_type_id' })
  sourceTaskType?: TaskType;

  @Column({ name: 'source_task_type_id', nullable: true })
  sourceTaskTypeId?: number;

  @ManyToOne(() => TaskType, { nullable: true })
  @JoinColumn({ name: 'target_task_type_id' })
  targetTaskType?: TaskType;

  @Column({ name: 'target_task_type_id', nullable: true })
  targetTaskTypeId?: number;

  @Column({ type: 'int', default: 10 })
  priority: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'created_by' })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

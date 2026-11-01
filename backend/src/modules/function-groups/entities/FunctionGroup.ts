// src/modules/function-groups/entities/FunctionGroup.ts
// Funkcja (grupa funkcyjna) nadawana osobowo obok roli – wyłącznie DODAJE uprawnienia.

import {
  Check, Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { RolePermissions } from '../../../entities/Role';
import { UserFunctionGroup } from './UserFunctionGroup';

@Entity('function_groups')
@Check('chk_function_groups_key', `"key" ~ '^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$'`)
@Check('chk_function_groups_no_all', `NOT ("permissions" ? 'all')`)
export class FunctionGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: {} })
  permissions: RolePermissions;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @OneToMany(() => UserFunctionGroup, membership => membership.functionGroup)
  memberships: UserFunctionGroup[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

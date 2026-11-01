// src/modules/function-groups/entities/UserFunctionGroup.ts
// Członkostwo osoby w funkcji z okresem obowiązywania. Historia jest niezmienna:
// odebranie funkcji ustawia valid_to, wiersz nie jest usuwany.

import {
  Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../../entities/User';
import { FunctionGroup } from './FunctionGroup';

@Entity('user_function_groups')
@Index('uq_user_function_groups_period', ['userId', 'functionGroupId', 'validFrom'], { unique: true })
@Check('chk_user_function_groups_period', '"valid_to" IS NULL OR "valid_to" >= "valid_from"')
export class UserFunctionGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, user => user.functionGroupMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'function_group_id', type: 'int' })
  functionGroupId: number;

  @ManyToOne(() => FunctionGroup, group => group.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'function_group_id' })
  functionGroup: FunctionGroup;

  @Column({ name: 'valid_from', type: 'timestamptz', default: () => 'now()' })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo: Date | null;

  @Column({ name: 'granted_by_id', type: 'int', nullable: true })
  grantedById: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'granted_by_id' })
  grantedBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

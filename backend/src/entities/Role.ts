// src/entities/Role.ts
// Encja roli użytkownika dla RBAC

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './User';

/**
 * Granularne uprawnienia dla kontraktów
 */
export interface ContractPermissions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  approve?: boolean;
  import?: boolean;
}

/**
 * Granularne uprawnienia dla podsystemów
 */
export interface SubsystemPermissions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  generateBom?: boolean;
  allocateNetwork?: boolean;
}

/**
 * Granularne uprawnienia dla sieci
 */
export interface NetworkPermissions {
  read?: boolean;
  createPool?: boolean;
  updatePool?: boolean;
  deletePool?: boolean;
  allocate?: boolean;
  viewMatrix?: boolean;
}

/**
 * Granularne uprawnienia dla kompletacji
 */
export interface CompletionPermissions {
  read?: boolean;
  scan?: boolean;
  assignPallet?: boolean;
  reportMissing?: boolean;
  decideContinue?: boolean;
  complete?: boolean;
}

/**
 * Granularne uprawnienia dla prefabrykacji
 */
export interface PrefabricationPermissions {
  read?: boolean;
  receiveOrder?: boolean;
  configure?: boolean;
  verify?: boolean;
  assignSerial?: boolean;
  complete?: boolean;
}

/**
 * Granularne uprawnienia dla powiadomień
 */
export interface NotificationPermissions {
  receiveAlerts?: boolean;
  sendManual?: boolean;
  configureTriggers?: boolean;
}

/**
 * Struktura wszystkich uprawnień
 */
export interface RolePermissions {
  all?: boolean; // Admin - pełny dostęp
  contracts?: ContractPermissions;
  subsystems?: SubsystemPermissions;
  network?: NetworkPermissions;
  completion?: CompletionPermissions;
  prefabrication?: PrefabricationPermissions;
  notifications?: NotificationPermissions;
  // Zachowanie kompatybilności z istniejącymi uprawnieniami
  [key: string]: any;
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  permissions: RolePermissions;

  @OneToMany(() => User, user => user.role)
  users: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

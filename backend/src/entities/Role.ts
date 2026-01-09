// src/entities/Role.ts
// Encja roli użytkownika dla RBAC

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './User';

/**
 * Granularne uprawnienia dla dashboard
 */
export interface DashboardPermissions {
  read?: boolean;
}

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
 * Granularne uprawnienia dla zadań
 */
export interface TaskPermissions {
  read?: boolean;
  create?: boolean | string; // true | 'SERWIS' (conditional: coordinator can only create SERWIS tasks)
  update?: boolean | string; // true | 'OWN' (conditional: worker can only edit own tasks)
  delete?: boolean;
  assign?: boolean;
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
 * Granularne uprawnienia dla sieci/IP
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
 * Granularne uprawnienia dla BOM
 */
export interface BOMPermissions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
}

/**
 * Granularne uprawnienia dla urządzeń
 */
export interface DevicePermissions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  verify?: boolean;
}

/**
 * Granularne uprawnienia dla użytkowników
 */
export interface UserPermissions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
}

/**
 * Granularne uprawnienia dla raportów
 */
export interface ReportPermissions {
  read?: boolean;
  create?: boolean;
  export?: boolean;
}

/**
 * Granularne uprawnienia dla ustawień
 */
export interface SettingsPermissions {
  read?: boolean;
  update?: boolean;
}

/**
 * Granularne uprawnienia dla zdjęć
 */
export interface PhotoPermissions {
  read?: boolean;
  create?: boolean;
  approve?: boolean;
}

/**
 * Granularne uprawnienia dla dokumentów
 */
export interface DocumentPermissions {
  read?: boolean;
  create?: boolean;
  delete?: boolean;
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
 * Granularne uprawnienia dla magazynu
 */
export interface WarehouseStockPermissions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  manage_locations?: boolean;
  adjust_stock?: boolean;
  view_history?: boolean;
  view_prices?: boolean;
  export?: boolean;
  import?: boolean;
  reserve_stock?: boolean;
  release_stock?: boolean;
  auto_assign?: boolean;
  scan_material?: boolean;
}

/**
 * Granularne uprawnienia dla brygad
 */
export interface BrigadePermissions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  assignMembers?: boolean;
  viewMembers?: boolean;
}

/**
 * Struktura wszystkich uprawnień - 17 modułów
 */
export interface RolePermissions {
  all?: boolean; // Admin - pełny dostęp
  dashboard?: DashboardPermissions;
  contracts?: ContractPermissions;
  subsystems?: SubsystemPermissions;
  tasks?: TaskPermissions;
  completion?: CompletionPermissions;
  prefabrication?: PrefabricationPermissions;
  network?: NetworkPermissions;
  bom?: BOMPermissions;
  devices?: DevicePermissions;
  users?: UserPermissions;
  reports?: ReportPermissions;
  settings?: SettingsPermissions;
  photos?: PhotoPermissions;
  documents?: DocumentPermissions;
  notifications?: NotificationPermissions;
  warehouse_stock?: WarehouseStockPermissions;
  brigades?: BrigadePermissions;
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

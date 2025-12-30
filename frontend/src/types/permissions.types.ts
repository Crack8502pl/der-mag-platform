// src/types/permissions.types.ts
// Types for granular permissions matching backend RolePermissions structure

export interface ContractPermissions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  approve?: boolean;
  import?: boolean;
}

export interface SubsystemPermissions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  generateBom?: boolean;
  allocateNetwork?: boolean;
}

export interface NetworkPermissions {
  read?: boolean;
  createPool?: boolean;
  updatePool?: boolean;
  deletePool?: boolean;
  allocate?: boolean;
  viewMatrix?: boolean;
}

export interface CompletionPermissions {
  read?: boolean;
  scan?: boolean;
  assignPallet?: boolean;
  reportMissing?: boolean;
  decideContinue?: boolean;
  complete?: boolean;
}

export interface PrefabricationPermissions {
  read?: boolean;
  receiveOrder?: boolean;
  configure?: boolean;
  verify?: boolean;
  assignSerial?: boolean;
  complete?: boolean;
}

export interface NotificationPermissions {
  receiveAlerts?: boolean;
  sendManual?: boolean;
  configureTriggers?: boolean;
}

export interface RolePermissions {
  all?: boolean; // Admin - pełny dostęp
  contracts?: ContractPermissions;
  subsystems?: SubsystemPermissions;
  network?: NetworkPermissions;
  completion?: CompletionPermissions;
  prefabrication?: PrefabricationPermissions;
  notifications?: NotificationPermissions;
  [key: string]: any;
}

export type PermissionModule = 'contracts' | 'subsystems' | 'network' | 'completion' | 'prefabrication' | 'notifications';
export type PermissionAction = string; // Flexible to allow any action string

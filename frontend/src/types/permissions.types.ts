// src/types/permissions.types.ts
// Types for granular permissions matching backend RolePermissions structure
// 15 modules, 27 actions

export interface DashboardPermissions {
  read?: boolean;
}

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

export interface TaskPermissions {
  read?: boolean;
  create?: boolean | string; // true | 'SERWIS' (conditional: coordinator can only create SERWIS tasks)
  update?: boolean | string; // true | 'OWN' (conditional: worker can only edit own tasks)
  delete?: boolean;
  assign?: boolean;
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

export interface NetworkPermissions {
  read?: boolean;
  createPool?: boolean;
  updatePool?: boolean;
  deletePool?: boolean;
  allocate?: boolean;
  viewMatrix?: boolean;
}

export interface BOMPermissions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
}

export interface DevicePermissions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  verify?: boolean;
}

export interface UserPermissions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
}

export interface ReportPermissions {
  read?: boolean;
  create?: boolean;
  export?: boolean;
}

export interface SettingsPermissions {
  read?: boolean;
  update?: boolean;
}

export interface PhotoPermissions {
  read?: boolean;
  create?: boolean;
  approve?: boolean;
}

export interface DocumentPermissions {
  read?: boolean;
  create?: boolean;
  delete?: boolean;
}

export interface NotificationPermissions {
  receiveAlerts?: boolean;
  sendManual?: boolean;
  configureTriggers?: boolean;
}

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

export interface BrigadePermissions {
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  assignMembers?: boolean;
  viewMembers?: boolean;
}

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
  [key: string]: any;
}

export type PermissionModule = 
  | 'all' 
  | 'dashboard'
  | 'contracts' 
  | 'subsystems' 
  | 'tasks'
  | 'completion'
  | 'prefabrication'
  | 'network'
  | 'bom'
  | 'devices'
  | 'users'
  | 'reports'
  | 'settings'
  | 'photos'
  | 'documents'
  | 'notifications'
  | 'warehouse_stock'
  | 'brigades';

export type PermissionAction = 
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'assign'
  | 'scan'
  | 'export'
  | 'import'
  | 'verify'
  | 'configure'
  | 'complete'
  | 'viewMatrix'
  | 'allocate'
  | 'generateBom'
  | 'receiveAlerts'
  | 'sendManual'
  | 'allocateNetwork'
  | 'assignPallet'
  | 'assignSerial'
  | 'configureTriggers'
  | 'createPool'
  | 'decideContinue'
  | 'deletePool'
  | 'receiveOrder'
  | 'reportMissing'
  | 'updatePool'
  | 'access'; // Used for admin-only routes with module: 'all'



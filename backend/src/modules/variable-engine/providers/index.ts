export { AbstractVariableProvider } from './AbstractVariableProvider';

// ─── Hierarchy providers (PR-4) ───────────────────────────────────────────────
export { HierarchyVariableProvider, TaskRelationshipTraversalService } from './hierarchy';
export type { IHierarchyTraversalService, HierarchyNode, ITaskRelationshipRepository } from './hierarchy';

// ─── CCTV/Network/Fiber/IP providers (PR-5) ──────────────────────────────────
export { CameraVariableProvider } from './camera';
export type { ICameraDataService, CameraData } from './camera';

export { SwitchVariableProvider } from './switch';
export type { ISwitchDataService, SwitchData } from './switch';

export { FiberVariableProvider } from './fiber';
export type { IFiberDataService, FiberData } from './fiber';

export { IpVariableProvider } from './ip';
export type { IIpDataService, IpData } from './ip';

// ─── Business providers (PR-6) ────────────────────────────────────────────────
export { ContractVariableProvider } from './contract';
export type { IContractDataService, ContractData } from './contract';

export { WarehouseVariableProvider } from './warehouse';
export type { IWarehouseDataService, WarehouseData } from './warehouse';

export { TaskVariableProvider } from './task';
export type { ITaskDataService, TaskData } from './task';

export { AiVariableProvider } from './ai';
export type { IAiDataService, AiData } from './ai';

export { UserVariableProvider } from './user';
export type { IUserDataService, UserData } from './user';

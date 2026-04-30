// src/types/networkTopology.types.ts
// TypeScript types for Network Topology Builder

export type NodeType = 'LCS' | 'NASTAWNIA' | 'PRZEJAZD' | 'SKP' | 'SWITCH' | 'ROUTER' | 'AUXILIARY';
export type NodeSourceType = 'task' | 'external' | 'auxiliary';
export type ConnectionTechnology = 'FIBER' | 'LAN';

export interface TopologyNode {
  id: string;
  type: NodeType;
  sourceType: NodeSourceType;
  label: string;
  positionX: number;
  positionY: number;
  kilometre?: number;
  isActive?: boolean;
  taskId?: number;
  metadata?: Record<string, unknown>;
}

export interface TopologyConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  technology: ConnectionTechnology;
  distance?: number;
  notes?: string;
}

export interface NetworkTopology {
  id: string;
  name: string;
  version: number;
  contractId: number;
  subsystemIndex: number;
  subsystemType: string;
  nodes: TopologyNode[];
  connections: TopologyConnection[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// DTO types (for sending data)
export interface CreateNetworkTopologyDto {
  name: string;
  contractId: number;
  subsystemIndex: number;
  subsystemType: string;
  nodes: (Omit<TopologyNode, 'id'> & { id?: string })[];
  connections: (Omit<TopologyConnection, 'id'> & { id?: string })[];
  notes?: string;
}

export type UpdateNetworkTopologyDto = CreateNetworkTopologyDto;

// API response types
export interface NetworkTopologyListResponse {
  success: boolean;
  data: NetworkTopology[];
}

export interface NetworkTopologyResponse {
  success: boolean;
  data: NetworkTopology;
}

export interface NetworkTopologyHistoryResponse {
  success: boolean;
  data: {
    data: NetworkTopology[];
    total: number;
    page: number;
    limit: number;
  };
}

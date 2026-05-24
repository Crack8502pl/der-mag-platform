// src/types/network-topology.types.ts
// TypeScript types and constants for Network Topology Builder

export type NodeType = 'task' | 'auxiliary' | 'external';
export type NodeSourceType = 'contract' | 'manual';
export type ConnectionTechnology = 'fiber' | 'lan';

export interface TopologyNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  data: {
    taskId?: number;
    km?: number;
    technology?: ConnectionTechnology;
    icon?: string;
    nodeTypeLabel?: string;
    [key: string]: unknown;
  };
}

export interface TopologyConnection {
  id: string;
  source: string;
  target: string;
  label?: string;
  technology?: ConnectionTechnology;
}

export interface NetworkTopologyData {
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
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const NODE_ICONS: Record<NodeType, string> = {
  task: '📦',
  auxiliary: '🔧',
  external: '🌐',
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  task: 'Zadanie',
  auxiliary: 'Obiekt pomocniczy',
  external: 'Zewnętrzny',
};

export const TECHNOLOGY_COLORS: Record<ConnectionTechnology, string> = {
  fiber: '#FF8C00',
  lan: '#1E90FF',
};

export const TECHNOLOGY_LABELS: Record<ConnectionTechnology, string> = {
  fiber: 'Światłowód',
  lan: 'LAN',
};

import type { TopologyNode, TopologyConnection } from '../../../types/networkTopology.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateTopology(nodes: TopologyNode[], connections: TopologyConnection[]): ValidationResult {
  const errors: string[] = [];

  if (nodes.length === 0) {
    errors.push('Topologia nie zawiera węzłów');
  }

  const nodeIds = new Set(nodes.map((n) => n.id));

  for (const conn of connections) {
    if (!nodeIds.has(conn.sourceNodeId)) {
      errors.push(`Połączenie ${conn.id}: nieznany węzeł źródłowy "${conn.sourceNodeId}"`);
    }
    if (!nodeIds.has(conn.targetNodeId)) {
      errors.push(`Połączenie ${conn.id}: nieznany węzeł docelowy "${conn.targetNodeId}"`);
    }
    if (conn.sourceNodeId === conn.targetNodeId) {
      errors.push(`Połączenie ${conn.id}: węzeł nie może być połączony sam ze sobą`);
    }
  }

  for (const node of nodes) {
    if ((node.sourceType === 'auxiliary' || node.sourceType === 'external') && node.kilometre == null) {
      errors.push(`Węzeł "${node.label}" (${node.sourceType}) nie ma podanego kilometrażu`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

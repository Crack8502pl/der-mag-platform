import type { TopologyNode } from '../../../types/network-topology.types';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;

export interface EdgePoint {
  x: number;
  y: number;
}

/**
 * Oblicza punkt zaczepienia linii na krawędzi węzła.
 * Zamiast środka węzła, linia kończy się na najbliższej krawędzi prostokąta.
 */
export function getEdgeConnectionPoint(
  node: TopologyNode,
  targetX: number,
  targetY: number
): EdgePoint {
  const nodeCenterX = node.position.x + NODE_WIDTH / 2;
  const nodeCenterY = node.position.y + NODE_HEIGHT / 2;

  const dx = targetX - nodeCenterX;
  const dy = targetY - nodeCenterY;

  const halfWidth = NODE_WIDTH / 2;
  const halfHeight = NODE_HEIGHT / 2;

  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) {
    return { x: nodeCenterX, y: nodeCenterY };
  }

  const dirX = dx / length;
  const dirY = dy / length;

  // Oblicz parametr t dla każdej krawędzi i wybierz najmniejszy dodatni
  let t = Infinity;

  if (dirX > 0) t = Math.min(t, halfWidth / dirX);
  if (dirX < 0) t = Math.min(t, -halfWidth / dirX);
  if (dirY > 0) t = Math.min(t, halfHeight / dirY);
  if (dirY < 0) t = Math.min(t, -halfHeight / dirY);

  return {
    x: nodeCenterX + dirX * t,
    y: nodeCenterY + dirY * t,
  };
}

/**
 * Oblicza punkty zaczepienia dla połączenia między dwoma węzłami.
 * Linia zaczyna się i kończy na krawędziach węzłów (nie w ich środkach).
 */
export function getConnectionEndpoints(
  sourceNode: TopologyNode,
  targetNode: TopologyNode
): { sourcePoint: EdgePoint; targetPoint: EdgePoint } {
  const sourceCenterX = sourceNode.position.x + NODE_WIDTH / 2;
  const sourceCenterY = sourceNode.position.y + NODE_HEIGHT / 2;
  const targetCenterX = targetNode.position.x + NODE_WIDTH / 2;
  const targetCenterY = targetNode.position.y + NODE_HEIGHT / 2;

  const sourcePoint = getEdgeConnectionPoint(sourceNode, targetCenterX, targetCenterY);
  const targetPoint = getEdgeConnectionPoint(targetNode, sourceCenterX, sourceCenterY);

  return { sourcePoint, targetPoint };
}

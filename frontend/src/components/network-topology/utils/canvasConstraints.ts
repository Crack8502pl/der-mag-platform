import type { TopologyNode } from '../../../types/network-topology.types';

export const NODE_WIDTH = 140;
export const NODE_HEIGHT_EST = 80;
export const CANVAS_BOUNDARY = 8;
export const NODE_COLLISION_GAP = 12;
export const MIN_READABLE_DIST_PX = 80;

export function calculateCanvasSize(
  nodes: TopologyNode[],
  padding: number,
  defaultWidth: number,
  defaultHeight: number,
): { width: number; height: number } {
  if (nodes.length === 0) {
    return { width: defaultWidth, height: defaultHeight };
  }

  return {
    width: nodes.reduce((m, n) => Math.max(m, n.position.x + NODE_WIDTH), 0) + padding,
    height: nodes.reduce((m, n) => Math.max(m, n.position.y + NODE_HEIGHT_EST), 0) + padding,
  };
}

export function clampNodePosition(
  x: number,
  y: number,
  canvasHeight: number,
): { x: number; y: number } {
  return {
    x: Math.max(CANVAS_BOUNDARY, x),
    y: Math.max(
      CANVAS_BOUNDARY,
      Math.min(canvasHeight - NODE_HEIGHT_EST - CANVAS_BOUNDARY, y),
    ),
  };
}

export function hasCollision(
  x: number,
  y: number,
  excludeId: string,
  nodes: TopologyNode[],
  gap: number = NODE_COLLISION_GAP,
): boolean {
  return nodes.some(n => {
    if (n.id === excludeId) return false;
    return (
      x < n.position.x + NODE_WIDTH + gap &&
      x + NODE_WIDTH + gap > n.position.x &&
      y < n.position.y + NODE_HEIGHT_EST + gap &&
      y + NODE_HEIGHT_EST + gap > n.position.y
    );
  });
}

export function findFreePosition(
  preferredX: number,
  preferredY: number,
  nodes: TopologyNode[],
  excludeId: string = '',
  gap: number = NODE_COLLISION_GAP,
): { x: number; y: number } {
  const step = NODE_WIDTH + gap;

  for (let radius = 0; radius <= 10; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const x = Math.max(CANVAS_BOUNDARY, preferredX + dx * step);
        const y = Math.max(CANVAS_BOUNDARY, preferredY + dy * step);
        if (!hasCollision(x, y, excludeId, nodes, gap)) {
          return { x, y };
        }
      }
    }
  }

  const maxX = nodes.reduce((m, n) => Math.max(m, n.position.x + NODE_WIDTH), 0);
  return { x: maxX + gap, y: CANVAS_BOUNDARY };
}

export function calculateFitZoom(
  nodes: TopologyNode[],
  containerW: number,
  containerH: number,
  zoomMin: number,
  zoomMax: number,
): number {
  if (nodes.length === 0) return 1.0;

  const { width: maxX, height: maxY } = calculateCanvasSize(
    nodes,
    CANVAS_BOUNDARY * 2,
    0,
    0,
  );

  const fitZoom = Math.min(containerW / maxX, containerH / maxY, zoomMax);
  return Math.max(zoomMin, Math.round(fitZoom * 10) / 10);
}

export function countTooClosePairs(nodes: TopologyNode[]): number {
  let tooCloseCount = 0;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].position.x - nodes[j].position.x;
      const dy = nodes[i].position.y - nodes[j].position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MIN_READABLE_DIST_PX) tooCloseCount++;
    }
  }
  return tooCloseCount;
}

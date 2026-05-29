import type { TopologyNode } from '../../../types/network-topology.types';
import {
  CANVAS_BOUNDARY,
  NODE_COLLISION_GAP,
  NODE_HEIGHT_EST,
  NODE_WIDTH,
  calculateFitZoom,
  clampNodePosition,
  countTooClosePairs,
  findFreePosition,
  hasCollision,
} from '../utils/canvasConstraints';

function makeNode(id: string, x: number, y: number): TopologyNode {
  return {
    id,
    type: 'task',
    label: id,
    position: { x, y },
    data: {},
  };
}

describe('canvasConstraints', () => {
  describe('hasCollision', () => {
    it('detects overlapping nodes', () => {
      const nodes = [makeNode('a', 100, 100), makeNode('b', 120, 120)];
      expect(hasCollision(110, 110, 'c', nodes)).toBe(true);
    });

    it('does not treat adjacent nodes with minimum gap as collision', () => {
      const nodes = [makeNode('a', 100, 100)];
      expect(hasCollision(100 + NODE_WIDTH + NODE_COLLISION_GAP, 100, 'b', nodes)).toBe(false);
    });

    it('ignores the same node id', () => {
      const nodes = [makeNode('a', 100, 100)];
      expect(hasCollision(100, 100, 'a', nodes)).toBe(false);
    });
  });

  describe('findFreePosition', () => {
    it('returns nearby free position when preferred is available', () => {
      const nodes = [makeNode('a', 400, 200)];
      expect(findFreePosition(100, 100, nodes)).toEqual({ x: 100, y: 100 });
    });

    it('falls back to appending on the right when spiral search is exhausted', () => {
      const preferredX = 100;
      const preferredY = 100;
      const step = NODE_WIDTH + NODE_COLLISION_GAP;
      const packed: TopologyNode[] = [];
      let id = 0;
      for (let radius = 0; radius <= 10; radius++) {
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
            packed.push(makeNode(`n-${id++}`, preferredX + dx * step, preferredY + dy * step));
          }
        }
      }

      const result = findFreePosition(preferredX, preferredY, packed);
      const maxX = packed.reduce((m, n) => Math.max(m, n.position.x + NODE_WIDTH), 0);
      expect(result).toEqual({ x: maxX + NODE_COLLISION_GAP, y: CANVAS_BOUNDARY });
    });
  });

  it('clamps Y based on canvas clientHeight and keeps boundary minimum', () => {
    const clampedBottom = clampNodePosition(20, 1000, 600);
    expect(clampedBottom.y).toBe(600 - NODE_HEIGHT_EST - CANVAS_BOUNDARY);

    const clampedTop = clampNodePosition(-20, -10, 600);
    expect(clampedTop.x).toBe(CANVAS_BOUNDARY);
    expect(clampedTop.y).toBe(CANVAS_BOUNDARY);
  });

  it('calculates fit-view zoom from topology bounds and container size', () => {
    const nodes = [makeNode('a', 900, 500)];
    expect(calculateFitZoom(nodes, 528, 298, 0.25, 2.0)).toBe(0.5);
  });

  it('counts too-close node pairs below 80px distance', () => {
    expect(countTooClosePairs([makeNode('a', 0, 0), makeNode('b', 100, 0)])).toBe(0);
    expect(countTooClosePairs([makeNode('a', 0, 0), makeNode('b', 70, 0)])).toBe(1);
  });
});

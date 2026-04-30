import type { TopologyNode } from '../../../types/networkTopology.types';

const COLUMNS = 4;
const SPACING_X = 200;
const SPACING_Y = 150;
const START_X = 50;
const START_Y = 50;

// Automatycznie rozmieszcza węzły w siatce (grid)
export function autoLayoutNodes(nodes: TopologyNode[]): TopologyNode[] {
  const sorted = [...nodes].sort((a, b) => {
    if (a.kilometre == null && b.kilometre == null) return 0;
    if (a.kilometre == null) return 1;
    if (b.kilometre == null) return -1;
    return a.kilometre - b.kilometre;
  });

  return sorted.map((node, index) => {
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    return {
      ...node,
      positionX: START_X + col * SPACING_X,
      positionY: START_Y + row * SPACING_Y,
    };
  });
}

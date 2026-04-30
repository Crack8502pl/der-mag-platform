import type { TopologyNode } from '../../../types/network-topology.types';

const COLUMNS = 4;
const SPACING_X = 200;
const SPACING_Y = 150;
const START_X = 50;
const START_Y = 50;

// Automatycznie rozmieszcza węzły w siatce (grid)
export function autoLayoutNodes(nodes: TopologyNode[]): TopologyNode[] {
  const sorted = [...nodes].sort((a, b) => {
    const aKm = a.data.km;
    const bKm = b.data.km;
    if (aKm == null && bKm == null) return 0;
    if (aKm == null) return 1;
    if (bKm == null) return -1;
    return aKm - bKm;
  });

  return sorted.map((node, index) => {
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    return {
      ...node,
      position: {
        x: START_X + col * SPACING_X,
        y: START_Y + row * SPACING_Y,
      },
    };
  });
}

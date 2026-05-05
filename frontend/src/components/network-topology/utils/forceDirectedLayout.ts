import type { TopologyNode, TopologyConnection } from '../../../types/network-topology.types';
import { doLinesIntersect, type Point } from './lineIntersection';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;

// Parametry algorytmu force-directed
const SPRING_LENGTH = 200;
const SPRING_STRENGTH = 0.05;
const REPULSION_STRENGTH = 5000;
const CROSSING_PENALTY = 8000;
const DAMPING = 0.85;
const MAX_ITERATIONS = 300;
const MIN_ENERGY = 0.5;

interface ForceNode extends TopologyNode {
  vx: number;
  vy: number;
  fx: number;
  fy: number;
}

/**
 * Główna funkcja optymalizacji układu — usuwa krzyżowania i równomiernie rozmieszcza węzły.
 * Uruchamiana manualnie przyciskiem "Optymalizuj układ".
 */
export function optimizeLayout(
  nodes: TopologyNode[],
  connections: TopologyConnection[]
): TopologyNode[] {
  if (nodes.length === 0) return nodes;

  const forceNodes: ForceNode[] = nodes.map(node => ({
    ...node,
    position: { x: node.position.x, y: node.position.y },
    vx: 0,
    vy: 0,
    fx: 0,
    fy: 0,
  }));

  const nodeMap = new Map<string, number>();
  forceNodes.forEach((node, idx) => nodeMap.set(node.id, idx));

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Reset sił
    forceNodes.forEach(node => {
      node.fx = 0;
      node.fy = 0;
    });

    // 1. Siły odpychające między wszystkimi węzłami (coulomb repulsion)
    for (let i = 0; i < forceNodes.length; i++) {
      for (let j = i + 1; j < forceNodes.length; j++) {
        const node1 = forceNodes[i];
        const node2 = forceNodes[j];

        const dx = node2.position.x - node1.position.x;
        const dy = node2.position.y - node1.position.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist < 1) continue;

        const force = REPULSION_STRENGTH / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        node1.fx -= fx;
        node1.fy -= fy;
        node2.fx += fx;
        node2.fy += fy;
      }
    }

    // 2. Siły przyciągające dla połączonych węzłów (hooke's law spring)
    connections.forEach(conn => {
      const sourceIdx = nodeMap.get(conn.source);
      const targetIdx = nodeMap.get(conn.target);
      if (sourceIdx === undefined || targetIdx === undefined) return;

      const source = forceNodes[sourceIdx];
      const target = forceNodes[targetIdx];

      const dx = target.position.x - source.position.x;
      const dy = target.position.y - source.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1) return;

      const force = (dist - SPRING_LENGTH) * SPRING_STRENGTH;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      source.fx += fx;
      source.fy += fy;
      target.fx -= fx;
      target.fy -= fy;
    });

    // 3. Kara za krzyżujące się linie (crossing penalty)
    const connectionLines = connections
      .map(conn => {
        const sourceIdx = nodeMap.get(conn.source);
        const targetIdx = nodeMap.get(conn.target);
        if (sourceIdx === undefined || targetIdx === undefined) return null;
        const source = forceNodes[sourceIdx];
        const target = forceNodes[targetIdx];
        return {
          id: conn.id,
          source: conn.source,
          target: conn.target,
          start: getNodeCenter(source),
          end: getNodeCenter(target),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    for (let i = 0; i < connectionLines.length; i++) {
      for (let j = i + 1; j < connectionLines.length; j++) {
        const conn1 = connectionLines[i];
        const conn2 = connectionLines[j];

        if (
          doLinesIntersect(
            { start: conn1.start, end: conn1.end },
            { start: conn2.start, end: conn2.end }
          )
        ) {
          const nodes1 = [
            forceNodes[nodeMap.get(conn1.source)!],
            forceNodes[nodeMap.get(conn1.target)!],
          ];
          const nodes2 = [
            forceNodes[nodeMap.get(conn2.source)!],
            forceNodes[nodeMap.get(conn2.target)!],
          ];

          nodes1.forEach(n1 => {
            nodes2.forEach(n2 => {
              const dx = n2.position.x - n1.position.x;
              const dy = n2.position.y - n1.position.y;
              const distSq = dx * dx + dy * dy;
              const dist = Math.sqrt(distSq);

              if (dist < 1) return;

              const force = CROSSING_PENALTY / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              n1.fx -= fx;
              n1.fy -= fy;
              n2.fx += fx;
              n2.fy += fy;
            });
          });
        }
      }
    }

    // 4. Aktualizacja prędkości i pozycji
    let totalEnergy = 0;
    forceNodes.forEach(node => {
      node.vx = (node.vx + node.fx) * DAMPING;
      node.vy = (node.vy + node.fy) * DAMPING;

      node.position.x += node.vx;
      node.position.y += node.vy;

      const margin = 50;
      node.position.x = Math.max(
        margin,
        Math.min(CANVAS_WIDTH - NODE_WIDTH - margin, node.position.x)
      );
      node.position.y = Math.max(
        margin,
        Math.min(CANVAS_HEIGHT - NODE_HEIGHT - margin, node.position.y)
      );

      totalEnergy += node.vx * node.vx + node.vy * node.vy;
    });

    if (totalEnergy < MIN_ENERGY) {
      break;
    }
  }

  return forceNodes.map(({ vx: _vx, vy: _vy, fx: _fx, fy: _fy, ...node }) => node);
}

function getNodeCenter(node: TopologyNode): Point {
  return {
    x: node.position.x + NODE_WIDTH / 2,
    y: node.position.y + NODE_HEIGHT / 2,
  };
}

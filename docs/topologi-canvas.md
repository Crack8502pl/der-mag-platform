🎯 Plan implementacji: Routing bezpośredni + auto-layout
📊 Przegląd rozwiązania
Kluczowe założenia:

    Linie proste między węzłami (routing bezpośredni)
    Linie zaczynają się i kończą na krawędziach węzłów (nie w środku)
    Wykrywanie krzyżowań - linie przecinające się = kolor czerwony
    Przycisk "Optymalizuj układ" - uruchamia algorytm force-directed layout
    Brak automatycznego przeskakiwania - węzły przesuwają się tylko po kliknięciu przycisku

🏗️ Architektura rozwiązania
Code

┌─────────────────────────────────────────────────────────────┐
│  NetworkTopologyEditor / NetworkTopologyStep                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  State:                                                       │
│  - nodes: TopologyNode[]                                      │
│  - connections: TopologyConnection[]                          │
│  - crossingConnections: Set<string>  ← NOWY                  │
│                                                               │
│  Nowe funkcje:                                                │
│  1. detectCrossings() → Set<string>                          │
│  2. optimizeLayout() → TopologyNode[]                        │
│  3. calculateEdgePoint() → {x, y}                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐  ┌──────────────────┐  ┌─────────────────┐
   │ Geometry    │  │ Force-Directed   │  │ Edge Routing    │
   │ Utils       │  │ Layout Algorithm │  │ Calculator      │
   └─────────────┘  └──────────────────┘  └─────────────────┘
   - lineIntersect  - repulsionForce     - findClosestEdge
   - pointDistance  - attractionForce    - calculateAnchor
                    - applyPhysics

📝 Szczegółowy plan implementacji
Krok 1: Geometria - wykrywanie krzyżowania liniiDoskonale! Mam już pełny obraz istniejącej implementacji. Teraz przygotowuję kompleksowy plan implementacji dla "Routing bezpośredni + auto-layout" z przyciskiem uruchamianym manualnie.
🎯 Pełny Plan Implementacji - Modyfikacje Topology Canvas
📊 Struktura planu
Code

├── 1. Limity połączeń światłowodowych ✅
├── 2. Routing bezpośredni + auto-layout 🔥
│   ├── 2.1 Wykrywanie krzyżowania linii
│   ├── 2.2 Force-directed layout algorithm
│   ├── 2.3 Routing do krawędzi węzłów
│   └── 2.4 Przycisk "Optymalizuj układ"
├── 3. Nowy format opisu węzła ✅
└── 4. Blokada usuniętych obiektów ✅

🚀 PUNKT 1: Limity połączeń (gotowe)

Już zaprezentowane w poprzedniej wiadomości. Bez zmian.
🔥 PUNKT 2: Routing bezpośredni + auto-layout
2.1 Wykrywanie krzyżowania linii
Plik: frontend/src/components/network-topology/utils/lineIntersection.ts (NOWY)
TypeScript

// Wykrywa czy dwa odcinki (linie) się przecinają
export interface Point {
  x: number;
  y: number;
}

export interface LineSegment {
  start: Point;
  end: Point;
}

/**
 * Sprawdza czy dwa odcinki się przecinają (algorytm CCW)
 * @returns true jeśli linie się przecinają
 */
export function doLinesIntersect(line1: LineSegment, line2: LineSegment): boolean {
  const { start: p1, end: p2 } = line1;
  const { start: p3, end: p4 } = line2;

  // Funkcja pomocnicza: orientacja trzech punktów (CCW test)
  const ccw = (a: Point, b: Point, c: Point): number => {
    return (c.y - a.y) * (b.x - a.x) - (b.y - a.y) * (c.x - a.x);
  };

  const ccw1 = ccw(p1, p3, p4);
  const ccw2 = ccw(p2, p3, p4);
  const ccw3 = ccw(p1, p2, p3);
  const ccw4 = ccw(p1, p2, p4);

  // Sprawdź czy linie się przecinają (różne znaki = przecięcie)
  if (ccw1 * ccw2 < 0 && ccw3 * ccw4 < 0) {
    return true;
  }

  // Sprawdź przypadki koliniarne (punkty na tej samej linii)
  // Ignorujemy je w tym przypadku, ponieważ to edge case
  return false;
}

/**
 * Znajduje wszystkie krzyżujące się połączenia w topologii
 * @returns Tablica par ID połączeń, które się krzyżują
 */
export function findCrossingConnections(
  connections: Array<{ id: string; start: Point; end: Point }>
): Array<[string, string]> {
  const crossings: Array<[string, string]> = [];

  for (let i = 0; i < connections.length; i++) {
    for (let j = i + 1; j < connections.length; j++) {
      const conn1 = connections[i];
      const conn2 = connections[j];

      // Pomiń linie dzielące węzeł końcowy (to nie jest krzyżowanie)
      const shareNode =
        (conn1.start.x === conn2.start.x && conn1.start.y === conn2.start.y) ||
        (conn1.start.x === conn2.end.x && conn1.start.y === conn2.end.y) ||
        (conn1.end.x === conn2.start.x && conn1.end.y === conn2.start.y) ||
        (conn1.end.x === conn2.end.x && conn1.end.y === conn2.end.y);

      if (shareNode) continue;

      if (
        doLinesIntersect(
          { start: conn1.start, end: conn1.end },
          { start: conn2.start, end: conn2.end }
        )
      ) {
        crossings.push([conn1.id, conn2.id]);
      }
    }
  }

  return crossings;
}

2.2 Force-Directed Layout Algorithm
Plik: frontend/src/components/network-topology/utils/forceDirectedLayout.ts (NOWY)
TypeScript

import type { TopologyNode, TopologyConnection } from '../../../types/network-topology.types';
import { doLinesIntersect, type Point, type LineSegment } from './lineIntersection';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const NODE_WIDTH = 140;
const NODE_HEIGHT = 80;

// Parametry algorytmu force-directed
const SPRING_LENGTH = 200; // Idealna długość połączenia
const SPRING_STRENGTH = 0.05; // Siła sprężyny (im większa, tym mocniejsze przyciąganie)
const REPULSION_STRENGTH = 5000; // Siła odpychania między węzłami
const CROSSING_PENALTY = 8000; // Dodatkowa siła odpychania dla krzyżujących się linii
const DAMPING = 0.85; // Tłumienie ruchu (0-1, im mniejsze tym wolniejsze zatrzymanie)
const MAX_ITERATIONS = 300; // Maksymalna liczba iteracji
const MIN_ENERGY = 0.5; // Próg energii - jeśli energia systemu spadnie poniżej, zatrzymaj

export interface ForceNode extends TopologyNode {
  vx: number; // prędkość x
  vy: number; // prędkość y
  fx: number; // siła x
  fy: number; // siła y
}

/**
 * Główna funkcja optymalizacji układu - usuwa krzyżowania i równomiernie rozmieszcza węzły
 */
export function optimizeLayout(
  nodes: TopologyNode[],
  connections: TopologyConnection[]
): TopologyNode[] {
  // Inicjalizacja węzłów z prędkościami i siłami
  const forceNodes: ForceNode[] = nodes.map(node => ({
    ...node,
    vx: 0,
    vy: 0,
    fx: 0,
    fy: 0,
  }));

  // Mapa ID węzła → indeks w tablicy
  const nodeMap = new Map<string, number>();
  forceNodes.forEach((node, idx) => {
    nodeMap.set(node.id, idx);
  });

  // Symulacja fizyki
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

        if (dist < 1) continue; // Unikaj dzielenia przez zero

        // Siła odpychania (odwrotnie proporcjonalna do kwadratu odległości)
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

      // Siła sprężyny (proporcjonalna do różnicy między aktualną a idealną długością)
      const force = (dist - SPRING_LENGTH) * SPRING_STRENGTH;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      source.fx += fx;
      source.fy += fy;
      target.fx -= fx;
      target.fy -= fy;
    });

    // 3. Kara za krzyżujące się linie (crossing penalty)
    const connectionLines = connections.map(conn => {
      const sourceIdx = nodeMap.get(conn.source);
      const targetIdx = nodeMap.get(conn.target);
      if (sourceIdx === undefined || targetIdx === undefined) {
        return null;
      }
      const source = forceNodes[sourceIdx];
      const target = forceNodes[targetIdx];
      return {
        id: conn.id,
        source: conn.source,
        target: conn.target,
        start: getNodeCenter(source),
        end: getNodeCenter(target),
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null);

    for (let i = 0; i < connectionLines.length; i++) {
      for (let j = i + 1; j < connectionLines.length; j++) {
        const conn1 = connectionLines[i];
        const conn2 = connectionLines[j];

        // Sprawdź czy linie się przecinają
        if (
          doLinesIntersect(
            { start: conn1.start, end: conn1.end },
            { start: conn2.start, end: conn2.end }
          )
        ) {
          // Zastosuj karę - odpychaj węzły obu linii od siebie
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

      // Trzymaj węzły w granicach canvas (z marginesem)
      const margin = 50;
      node.position.x = Math.max(margin, Math.min(CANVAS_WIDTH - NODE_WIDTH - margin, node.position.x));
      node.position.y = Math.max(margin, Math.min(CANVAS_HEIGHT - NODE_HEIGHT - margin, node.position.y));

      totalEnergy += node.vx * node.vx + node.vy * node.vy;
    });

    // Zatrzymaj jeśli energia jest bardzo niska (układ się ustabilizował)
    if (totalEnergy < MIN_ENERGY) {
      console.log(`Layout converged after ${iteration + 1} iterations`);
      break;
    }
  }

  // Zwróć zoptymalizowane węzły (bez velocity i force)
  return forceNodes.map(({ vx, vy, fx, fy, ...node }) => node as TopologyNode);
}

/**
 * Oblicza środek węzła
 */
function getNodeCenter(node: TopologyNode): Point {
  return {
    x: node.position.x + NODE_WIDTH / 2,
    y: node.position.y + NODE_HEIGHT / 2,
  };
}

2.3 Routing do krawędzi węzłów
Plik: frontend/src/components/network-topology/utils/edgeRouting.ts (NOWY)
TypeScript

import type { TopologyNode } from '../../../types/network-topology.types';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 80;

export interface EdgePoint {
  x: number;
  y: number;
}

/**
 * Oblicza punkt zaczepienia linii na krawędzi węzła
 * Zamiast środka węzła, linia kończy się na najbliższej krawędzi
 */
export function getEdgeConnectionPoint(
  node: TopologyNode,
  targetX: number,
  targetY: number
): EdgePoint {
  const nodeCenterX = node.position.x + NODE_WIDTH / 2;
  const nodeCenterY = node.position.y + NODE_HEIGHT / 2;

  // Wektor od środka węzła do celu
  const dx = targetX - nodeCenterX;
  const dy = targetY - nodeCenterY;

  // Oblicz przecięcie z prostokątem węzła
  const halfWidth = NODE_WIDTH / 2;
  const halfHeight = NODE_HEIGHT / 2;

  // Normalizacja wektora
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) {
    return { x: nodeCenterX, y: nodeCenterY };
  }

  const dirX = dx / length;
  const dirY = dy / length;

  // Sprawdź która krawędź zostanie przecięta pierwsza
  let t = Infinity;

  // Prawa krawędź (x = nodeCenterX + halfWidth)
  if (dirX > 0) {
    t = Math.min(t, halfWidth / dirX);
  }
  // Lewa krawędź (x = nodeCenterX - halfWidth)
  if (dirX < 0) {
    t = Math.min(t, -halfWidth / dirX);
  }
  // Dolna krawędź (y = nodeCenterY + halfHeight)
  if (dirY > 0) {
    t = Math.min(t, halfHeight / dirY);
  }
  // Górna krawędź (y = nodeCenterY - halfHeight)
  if (dirY < 0) {
    t = Math.min(t, -halfHeight / dirY);
  }

  return {
    x: nodeCenterX + dirX * t,
    y: nodeCenterY + dirY * t,
  };
}

/**
 * Oblicza punkty zaczepienia dla połączenia między dwoma węzłami
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

2.4 Przycisk "Optymalizuj układ" i wizualizacja krzy��owań
Modyfikacja: frontend/src/components/network-topology/TopologyToolbar.tsx
TypeScript

// Dodaj nowy props
interface TopologyToolbarProps {
  onAutoLayout: () => void;
  onOptimizeLayout: () => void; // ✅ NOWY
  onSave: () => void;
  saving?: boolean;
  isDirty: boolean;
  crossingCount?: number; // ✅ NOWY - liczba krzyżujących się linii
}

export const TopologyToolbar: React.FC<TopologyToolbarProps> = ({
  onAutoLayout,
  onOptimizeLayout, // ✅ NOWY
  onSave,
  saving = false,
  isDirty = false,
  crossingCount = 0, // ✅ NOWY
}) => {
  return (
    <div className="topology-toolbar">
      <button className="btn btn-sm btn-secondary" onClick={onAutoLayout} title="Rozmieść węzły w siatce">
        📊 Auto-układ
      </button>

      {/* ✅ NOWY PRZYCISK */}
      <button
        className={`btn btn-sm ${crossingCount > 0 ? 'btn-warning' : 'btn-secondary'}`}
        onClick={onOptimizeLayout}
        title="Optymalizuj układ - usuń krzyżowania linii"
      >
        ⚡ Optymalizuj {crossingCount > 0 && `(${crossingCount})`}
      </button>

      <button
        className={`btn btn-sm ${isDirty ? 'btn-primary' : 'btn-secondary'}`}
        onClick={onSave}
        disabled={saving}
      >
        {saving ? 'Zapisywanie...' : '💾 Zapisz'}
      </button>

      {/* ✅ NOWY: Ostrzeżenie o krzyżowaniach */}
      {crossingCount > 0 && (
        <div className="topology-toolbar-warning">
          ⚠️ Wykryto {crossingCount} krzyżujących się {crossingCount === 1 ? 'połączenie' : 'połączeń'}
        </div>
      )}
    </div>
  );
};

Style CSS: frontend/src/components/network-topology/TopologyToolbar.css
CSS

.topology-toolbar-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(255, 152, 0, 0.15);
  border: 1px solid rgba(255, 152, 0, 0.4);
  border-radius: 4px;
  font-size: 12px;
  color: var(--warning);
  font-weight: 600;
  margin-left: auto;
}

.btn-warning {
  background: var(--warning);
  color: white;
  font-weight: 600;
}

.btn-warning:hover {
  background: #e67e00;
}

2.5 Integracja w głównym komponencie
Modyfikacja: frontend/src/components/network-topology/NetworkTopologyStep.tsx
TypeScript

import { optimizeLayout } from './utils/forceDirectedLayout';
import { findCrossingConnections } from './utils/lineIntersection';
import { getConnectionEndpoints } from './utils/edgeRouting';

export const NetworkTopologyStep: React.FC<NetworkTopologyStepProps> = ({
  wizardData,
  onUpdate,
  subsystemIndex,
}) => {
  // ... istniejący state ...

  // ✅ NOWY STATE: Krzyżujące się połączenia
  const [crossingConnections, setCrossingConnections] = useState<Set<string>>(new Set());

  // ✅ NOWA FUNKCJA: Optymalizacja układu (force-directed)
  const handleOptimizeLayout = useCallback(() => {
    const optimized = optimizeLayout(nodes, connections);
    setNodes(optimized);
    setIsDirty(true);
    
    // Wyświetl komunikat
    alert('✅ Układ zoptymalizowany! Sprawdź czy krzyżowania zostały usunięte.');
  }, [nodes, connections]);

  // ✅ EFFECT: Wykryj krzyżujące się linie przy każdej zmianie
  useEffect(() => {
    const connectionLines = connections.map(conn => {
      const source = nodes.find(n => n.id === conn.source);
      const target = nodes.find(n => n.id === conn.target);
      if (!source || !target) return null;

      const { sourcePoint, targetPoint } = getConnectionEndpoints(source, target);
      return {
        id: conn.id,
        start: sourcePoint,
        end: targetPoint,
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null);

    const crossings = findCrossingConnections(connectionLines);
    const crossingIds = new Set<string>();
    crossings.forEach(([id1, id2]) => {
      crossingIds.add(id1);
      crossingIds.add(id2);
    });

    setCrossingConnections(crossingIds);
  }, [nodes, connections]);

  // ✅ MODYFIKACJA: Renderowanie linii z krawędziami + czerwony kolor dla krzyżowań
  return (
    <div className="topology-step">
      {/* ... */}
      
      <TopologyToolbar
        onAutoLayout={handleAutoLayout}
        onOptimizeLayout={handleOptimizeLayout} // ✅ NOWY
        onSave={handleSave}
        saving={false}
        isDirty={isDirty}
        crossingCount={crossingConnections.size / 2} // ✅ NOWY (dzieli przez 2 bo każde krzyżowanie liczy 2 linie)
      />

      {/* ... */}

      {/* SVG overlay for connection lines */}
      <svg className="topology-connections-svg">
        <defs>{/* ... */}</defs>
        
        {connections.map(conn => {
          const src = nodes.find(n => n.id === conn.source);
          const tgt = nodes.find(n => n.id === conn.target);
          if (!src || !tgt) return null;

          // ✅ NOWY: Użyj routing do krawędzi zamiast środka
          const { sourcePoint, targetPoint } = getConnectionEndpoints(src, tgt);
          const isCrossing = crossingConnections.has(conn.id); // ✅ NOWY
          const isSelected = conn.id === selectedId;
          const tech = (conn.technology ?? 'fiber').toLowerCase();

          return (
            <g key={conn.id}>
              {/* Niewidzialna gruba linia do klikania */}
              <line
                x1={sourcePoint.x}
                y1={sourcePoint.y}
                x2={targetPoint.x}
                y2={targetPoint.y}
                stroke="transparent"
                strokeWidth="16"
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedId(p => (p === conn.id ? null : conn.id));
                }}
              />
              {/* Widoczna linia */}
              <line
                x1={sourcePoint.x}
                y1={sourcePoint.y}
                x2={targetPoint.x}
                y2={targetPoint.y}
                className={`topology-conn topology-conn--${tech}${isSelected ? ' topology-conn--selected' : ''}${isCrossing ? ' topology-conn--crossing' : ''}`}
                style={{ pointerEvents: 'none' }}
                markerEnd={`url(#step-arrow-${tech})`}
              />
            </g>
          );
        })}
      </svg>

      {/* ... Nodes ... */}
    </div>
  );
};

Style CSS dla krzyżujących się linii: frontend/src/components/network/topology/NetworkTopologyEditor.css
CSS

/* Krzyżujące się linie - kolor czerwony */
.topology-conn--crossing {
  stroke: #e74c3c !important;
  stroke-width: 3;
  opacity: 0.8;
  animation: pulse-crossing 1.5s ease-in-out infinite;
}

@keyframes pulse-crossing {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
}

🎨 PUNKT 3: Nowy format opisu węzła (gotowe)

Już zaprezentowane w poprzedniej wiadomości. Bez zmian.
🔒 PUNKT 4: Blokada usuniętych obiektów (gotowe)

Już zaprezentowane w poprzedniej wiadomości. Bez zmian.
📦 Podsumowanie - pliki do utworzenia/modyfikacji
NOWE PLIKI:
Code

frontend/src/components/network-topology/utils/
├── lineIntersection.ts           (90 linii)
├── forceDirectedLayout.ts        (200 linii)
├── edgeRouting.ts                (80 linii)
└── parseTaskLabel.ts             (50 linii)

MODYFIKOWANE PLIKI:
Code

frontend/src/components/network-topology/
├── NetworkTopologyStep.tsx        (+60 linii)
├── TopologyToolbar.tsx            (+15 linii)
└── TopologyToolbar.css            (+20 linii)

frontend/src/components/network/topology/
├── NetworkTopologyEditor.tsx      (+80 linii)
├── NetworkTopologyEditor.css      (+15 linii)
├── CustomNode.tsx                 (+35 linii)
└── CustomNode.css                 (+30 linii)

frontend/src/types/
└── network-topology.types.ts      (+25 linii)

Łącznie: ~700 linii kodu
🎬 Kolejność implementacji
Faza 1: Podstawy (Dzień 1)

    ✅ Limity połączeń (Punkt 1)
    ✅ Nowy format opisu (Punkt 3)
    ✅ Blokada usuniętych (Punkt 4)

Faza 2: Routing (Dzień 2-3)

    🔥 Wykrywanie krzyżowań (lineIntersection.ts)
    🔥 Routing do krawędzi (edgeRouting.ts)
    🔥 Wizualizacja krzyżowań (CSS + komponenty)

Faza 3: Optymalizacja (Dzień 4-5)

    🔥 Force-directed layout (forceDirectedLayout.ts)
    🔥 Integracja z przyciskiem "Optymalizuj"
    🧪 Testowanie i fine-tuning parametrów

🔧 Parametry do dostrojenia

W pliku forceDirectedLayout.ts możesz dostroić:
TypeScript

const SPRING_LENGTH = 200;        // Idealna odległość między połączonymi węzłami
const SPRING_STRENGTH = 0.05;     // Siła przyciągania (wyższe = mocniejsze)
const REPULSION_STRENGTH = 5000;  // Siła odpychania (wyższe = większe odstępy)
const CROSSING_PENALTY = 8000;    // Dodatkowa kara za krzyżowania
const DAMPING = 0.85;             // Tłumienie (0.7-0.95 optymalne)
const MAX_ITERATIONS = 300;       // Max iteracji (100-500)

Rekomendacja: Zacznij od powyższych wartości i dostosuj po testach z rzeczywistymi danymi.
🚀 Co dalej?
Opcja A: Implementacja etapami

Mogę otworzyć 3 Pull Requesty:

    PR #1: Punkt 1, 3, 4 (podstawy - dzień 1)
    PR #2: Punkt 2.1, 2.3, 2.4 (wykrywanie + routing - dzień 2)
    PR #3: Punkt 2.2 (force-directed layout - dzień 3-4)

Opcja B: Wszystko w jednym PR

Jeden duży PR z pełną implementacją (~700 linii).
Opcja C: Demo interaktywne

Mogę stworzyć standalone HTML/JS demo algorytmu force-directed do przetestowania przed pełną integracją.
❓ Decyzja potrzebna:

    Którą opcję implementacji wybierasz? (A, B, C)
    Czy mam otworzyć pierwszy PR teraz (Punkt 1, 3, 4)?
    Czy chcesz zobaczyć demo force-directed przed pełną implementacją?

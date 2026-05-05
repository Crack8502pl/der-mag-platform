// Wykrywa czy dwa odcinki (linie) się przecinają

export interface Point {
  x: number;
  y: number;
}

/**
 * Oblicza odległość euklidesową między dwoma punktami.
 */
export function pointDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
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

  return false;
}

/**
 * Znajduje wszystkie krzyżujące się połączenia w topologii.
 * Używa nodeId do wykrywania wspólnych węzłów zamiast porównywania współrzędnych
 * (które mogą mieć błędy floating-point przy edge routing).
 */
export function findCrossingConnections(
  connections: Array<{ id: string; sourceId: string; targetId: string; start: Point; end: Point }>
): Array<[string, string]> {
  const crossings: Array<[string, string]> = [];

  for (let i = 0; i < connections.length; i++) {
    for (let j = i + 1; j < connections.length; j++) {
      const conn1 = connections[i];
      const conn2 = connections[j];

      // Pomiń połączenia dzielące węzeł — to nie jest krzyżowanie
      const shareNode =
        conn1.sourceId === conn2.sourceId ||
        conn1.sourceId === conn2.targetId ||
        conn1.targetId === conn2.sourceId ||
        conn1.targetId === conn2.targetId;

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

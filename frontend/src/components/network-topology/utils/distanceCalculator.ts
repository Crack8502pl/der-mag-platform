// Oblicza odległość między dwoma węzłami na podstawie ich kilometrażu
export function calculateDistance(sourceKm?: number, targetKm?: number): number | undefined {
  if (sourceKm == null || targetKm == null || isNaN(sourceKm) || isNaN(targetKm)) {
    return undefined;
  }
  return Math.abs(targetKm - sourceKm);
}

// Formatuje odległość do postaci "X.XX km"
export function formatDistance(distance?: number): string {
  if (distance == null || isNaN(distance)) {
    return '-';
  }
  return `${distance.toFixed(2)} km`;
}

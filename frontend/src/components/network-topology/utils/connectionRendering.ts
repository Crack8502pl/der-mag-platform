export interface ConnectionLabelGeometry {
  cx: number;
  cy: number;
  readableAngle: number;
  connLabelText: string;
}

export function buildConnectionLabelGeometry(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  technology?: string,
  label?: string,
): ConnectionLabelGeometry | null {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  const rawKm = label ? parseFloat(label) : null;
  const displayKm = rawKm !== null && !Number.isNaN(rawKm) ? `${Math.round(rawKm)} km` : null;

  const lineAngleDeg = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  const readableAngle = lineAngleDeg > 90 || lineAngleDeg < -90
    ? lineAngleDeg + 180
    : lineAngleDeg;

  const connLabelText = [
    technology?.toUpperCase() ?? '',
    displayKm ?? '',
  ].filter(Boolean).join(' ').trim();

  return connLabelText
    ? { cx, cy, readableAngle, connLabelText }
    : null;
}

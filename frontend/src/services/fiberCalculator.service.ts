// src/services/fiberCalculator.service.ts
// Service for calculating fiber optic transmission distances between objects

import type { FiberConnection, FiberEndpoint } from '../types/fiber.types';

/**
 * Calculates distance in metres based on railway kilometrage difference.
 * Used when both endpoints have known kilometre markers on the same line.
 */
export const calculateByKilometraz = (km1: number, km2: number): number => {
  return Math.abs(km2 - km1) * 1000;  // convert km difference to metres
};

/**
 * Calculates distance in metres between two GPS coordinates using the Haversine formula.
 */
export const calculateByGPS = (
  gps1: { lat: number; lng: number },
  gps2: { lat: number; lng: number }
): number => {
  const R = 6_371_000; // Earth radius in metres
  const φ1 = (gps1.lat * Math.PI) / 180;
  const φ2 = (gps2.lat * Math.PI) / 180;
  const Δφ = ((gps2.lat - gps1.lat) * Math.PI) / 180;
  const Δλ = ((gps2.lng - gps1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Returns the best available distance estimate for a connection.
 * Prefers kilometrage-based calculation if both endpoints have km markers,
 * falls back to GPS if coordinates are available.
 */
export const estimateDistance = (
  start: FiberEndpoint,
  end: FiberEndpoint
): number => {
  if (start.kilometraz != null && end.kilometraz != null) {
    return calculateByKilometraz(start.kilometraz, end.kilometraz);
  }
  if (start.gps && end.gps) {
    return calculateByGPS(start.gps, end.gps);
  }
  return 0;
};

/**
 * Returns the number of fibers required for the given insert type.
 * DUPLEX uses 2 fibers, WDM uses 1 fiber.
 */
export const fibersForInsert = (typ: 'DUPLEX' | 'WDM'): number =>
  typ === 'DUPLEX' ? 2 : 1;

/**
 * Sums the total required fibers across all connections.
 */
export const sumFibers = (connections: FiberConnection[]): number =>
  connections.reduce((acc, conn) => acc + conn.iloscWlokien, 0);

/**
 * Sums the total cable length in kilometres across all connections.
 */
export const totalLengthKm = (connections: FiberConnection[]): number =>
  connections.reduce((acc, conn) => acc + conn.odleglosc / 1000, 0);

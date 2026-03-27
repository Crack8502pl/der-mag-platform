// src/types/honeypot.types.ts
// Typy danych dla systemu honeypota

export type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface HoneypotStats {
  totalHits: number;
  uniqueIPs: number;
  last24h: number;
  scannerBreakdown: Record<string, number>;
  threatLevelBreakdown: Record<string, number>;
  topTargetedPaths: Array<{ path: string; count: number }>;
  hourlyDistribution: number[];
}

export interface SuspiciousIP {
  ip: string;
  hitCount: number;
  scanners: string[];
  lastSeen: string;
  threatLevel: ThreatLevel;
}

export interface HoneypotLog {
  id: number;
  ip: string;
  userAgent: string | null;
  method: string;
  path: string;
  headers: Record<string, string> | null;
  detectedScanner: string | null;
  honeypotType: string | null;
  queryParams: string | null;
  requestBody: string | null;
  threatLevel: ThreatLevel;
  createdAt: string;
  reviewed: boolean;
  notes: string | null;
}

export interface CheckIPResult {
  suspicious: boolean;
  hitCount: number;
  lastSeen: string | null;
}

export interface CleanupResult {
  deleted: number;
}

// src/services/HoneypotService.ts
// Serwis honeypota - logowanie trafień, statystyki i zarządzanie

import { AppDataSource } from '../config/database';
import { HoneypotLog, ThreatLevel } from '../entities/HoneypotLog';
import { serverLogger } from '../utils/logger';
import { MoreThan, LessThan } from 'typeorm';

// Maksymalna długość zapisywanego body requestu
const MAX_REQUEST_BODY_LENGTH = 2000;

// Interfejsy wynikowe
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
  lastSeen: Date;
  threatLevel: ThreatLevel;
}

export interface LogHitParams {
  ip: string;
  userAgent: string | null;
  method: string;
  path: string;
  headers: Record<string, string>;
  detectedScanner: string | null;
  honeypotType: string | null;
  queryParams: string | null;
  requestBody: string | null;
  threatLevel: ThreatLevel;
}

export class HoneypotService {
  /**
   * Zapisuje trafienie honeypota do bazy danych
   */
  static async logHit(params: LogHitParams): Promise<void> {
    try {
      const repo = AppDataSource.getRepository(HoneypotLog);
      const log = repo.create({
        ip: params.ip,
        userAgent: params.userAgent,
        method: params.method,
        path: params.path,
        headers: params.headers,
        detectedScanner: params.detectedScanner,
        honeypotType: params.honeypotType,
        queryParams: params.queryParams,
        requestBody: params.requestBody ? params.requestBody.substring(0, MAX_REQUEST_BODY_LENGTH) : null,
        threatLevel: params.threatLevel,
        reviewed: false,
        notes: null,
      });
      await repo.save(log);
    } catch (error) {
      serverLogger.error('Błąd podczas zapisywania logu honeypota:', error);
    }
  }

  /**
   * Zwraca statystyki honeypota z ostatnich N dni
   */
  static async getStats(days: number = 30): Promise<HoneypotStats> {
    const repo = AppDataSource.getRepository(HoneypotLog);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);

    // Całkowita liczba trafień w zadanym okresie
    const totalHits = await repo.count({
      where: { createdAt: MoreThan(since) },
    });

    // Liczba unikalnych IP w zadanym okresie
    const uniqueIPsRaw = await repo
      .createQueryBuilder('log')
      .select('COUNT(DISTINCT log.ip)', 'count')
      .where('log.createdAt > :since', { since })
      .getRawOne<{ count: string }>();
    const uniqueIPs = uniqueIPsRaw ? Number(uniqueIPsRaw.count) : 0;

    // Liczba trafień w ostatnich 24 godzinach
    const last24hHits = await repo.count({
      where: { createdAt: MoreThan(last24h) },
    });

    // Rozkład skanerów
    const scannerRows = await repo
      .createQueryBuilder('log')
      .select('log.detectedScanner', 'scanner')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt > :since', { since })
      .groupBy('log.detectedScanner')
      .getRawMany<{ scanner: string | null; count: string }>();

    const scannerBreakdown: Record<string, number> = {};
    for (const row of scannerRows) {
      const key = row.scanner ?? 'Nieznany';
      scannerBreakdown[key] = Number(row.count);
    }

    // Rozkład poziomów zagrożeń
    const threatRows = await repo
      .createQueryBuilder('log')
      .select('log.threatLevel', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt > :since', { since })
      .groupBy('log.threatLevel')
      .getRawMany<{ level: string; count: string }>();

    const threatLevelBreakdown: Record<string, number> = {};
    for (const row of threatRows) {
      threatLevelBreakdown[row.level] = Number(row.count);
    }

    // Najczęściej atakowane ścieżki (top 10)
    const topPathRows = await repo
      .createQueryBuilder('log')
      .select('log.path', 'path')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt > :since', { since })
      .groupBy('log.path')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany<{ path: string; count: string }>();

    const topTargetedPaths = topPathRows.map(row => ({
      path: row.path,
      count: Number(row.count),
    }));

    // Rozkład godzinowy (24 godziny) dla ostatnich 24h
    const hourlyDistribution = new Array(24).fill(0);
    const hourlyRows = await repo
      .createQueryBuilder('log')
      .select('EXTRACT(HOUR FROM log.createdAt)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('log.createdAt > :last24h', { last24h })
      .groupBy('hour')
      .getRawMany<{ hour: string | number; count: string }>();

    for (const row of hourlyRows) {
      const hourIndex = Number(row.hour);
      if (hourIndex >= 0 && hourIndex < 24) {
        hourlyDistribution[hourIndex] = Number(row.count);
      }
    }

    return {
      totalHits,
      uniqueIPs,
      last24h: last24hHits,
      scannerBreakdown,
      threatLevelBreakdown,
      topTargetedPaths,
      hourlyDistribution,
    };
  }

  /**
   * Zwraca listę podejrzanych IP (IP z minHits trafieniami lub więcej)
   */
  static async getSuspiciousIPs(minHits: number = 5): Promise<SuspiciousIP[]> {
    const repo = AppDataSource.getRepository(HoneypotLog);

    const result = await repo
      .createQueryBuilder('log')
      .select('log.ip', 'ip')
      .addSelect('COUNT(*)', 'hitCount')
      .addSelect('MAX(log.createdAt)', 'lastSeen')
      .addSelect('MAX(log.threatLevel)', 'maxThreatLevel')
      .addSelect(
        'ARRAY_AGG(DISTINCT log.detectedScanner) FILTER (WHERE log.detectedScanner IS NOT NULL)',
        'scanners'
      )
      .groupBy('log.ip')
      .having('COUNT(*) >= :minHits', { minHits })
      .orderBy('"hitCount"', 'DESC')
      .getRawMany();

    return result.map((row: any) => {
      // Upewnij się, że scanners jest tablicą stringów
      const scannersArray: string[] = Array.isArray(row.scanners)
        ? row.scanners.filter(Boolean)
        : String(row.scanners ?? '')
            .replace(/[{}]/g, '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);

      return {
        ip: row.ip,
        hitCount: parseInt(row.hitCount, 10),
        scanners: scannersArray,
        lastSeen: new Date(row.lastSeen),
        threatLevel: row.maxThreatLevel || ThreatLevel.LOW,
      };
    });
  }

  /**
   * Zwraca ostatnie logi honeypota
   */
  static async getRecentLogs(
    limit: number = 50,
    threatLevel?: ThreatLevel
  ): Promise<HoneypotLog[]> {
    const repo = AppDataSource.getRepository(HoneypotLog);
    const where: any = {};
    if (threatLevel) {
      where.threatLevel = threatLevel;
    }
    return repo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Eksportuje logi do formatu JSON lub CSV
   */
  static async exportLogs(
    format: 'json' | 'csv',
    days: number = 30
  ): Promise<string> {
    const repo = AppDataSource.getRepository(HoneypotLog);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await repo.find({
      where: { createdAt: MoreThan(since) },
      order: { createdAt: 'DESC' },
    });

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // RFC4180 CSV escaping - opakowuje pole w cudzysłowy jeśli zawiera separator,
    // cudzysłów lub nową linię; podwaja cudzysłowy wewnątrz; neutralizuje formuły CSV.
    const escapeCsvField = (value: unknown): string => {
      const str = value === null || value === undefined ? '' : String(value);
      // Neutralizacja CSV injection (=, +, -, @, TAB, CR)
      const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
      // Opakowuj w cudzysłowy jeśli zawiera przecinek, cudzysłów lub nową linię
      if (/[",\n\r]/.test(sanitized)) {
        return `"${sanitized.replace(/"/g, '""')}"`;
      }
      return sanitized;
    };

    // Format CSV
    const headers = [
      'id', 'ip', 'userAgent', 'method', 'path',
      'detectedScanner', 'honeypotType', 'threatLevel',
      'queryParams', 'createdAt', 'reviewed',
    ];
    const rows = logs.map(log => [
      log.id,
      log.ip,
      log.userAgent,
      log.method,
      log.path,
      log.detectedScanner,
      log.honeypotType,
      log.threatLevel,
      log.queryParams,
      log.createdAt.toISOString(),
      log.reviewed,
    ].map(escapeCsvField).join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Usuwa stare logi honeypota (starsze niż olderThanDays dni)
   */
  static async cleanupOldLogs(olderThanDays: number = 90): Promise<number> {
    const repo = AppDataSource.getRepository(HoneypotLog);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await repo.delete({
      createdAt: LessThan(cutoffDate),
    });

    return result.affected || 0;
  }

  /**
   * Sprawdza czy dane IP jest podejrzane (przekroczyło próg trafień)
   */
  static async isIPSuspicious(
    ip: string,
    threshold: number = 5
  ): Promise<{ suspicious: boolean; hitCount: number; lastSeen: Date | null }> {
    const repo = AppDataSource.getRepository(HoneypotLog);

    const count = await repo.count({ where: { ip } });
    const lastLog = await repo.findOne({
      where: { ip },
      order: { createdAt: 'DESC' },
    });

    return {
      suspicious: count >= threshold,
      hitCount: count,
      lastSeen: lastLog?.createdAt || null,
    };
  }
}

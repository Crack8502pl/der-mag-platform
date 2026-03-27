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

    const logs = await repo.find({
      where: { createdAt: MoreThan(since) },
      select: ['id', 'ip', 'detectedScanner', 'threatLevel', 'path', 'createdAt'],
    });

    // Unikalne IP
    const uniqueIPsSet = new Set(logs.map(l => l.ip));

    // Ostatnie 24h
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    const recentLogs = logs.filter(l => l.createdAt > last24h);

    // Rozkład skanerów
    const scannerBreakdown: Record<string, number> = {};
    for (const log of logs) {
      const scanner = log.detectedScanner || 'Nieznany';
      scannerBreakdown[scanner] = (scannerBreakdown[scanner] || 0) + 1;
    }

    // Rozkład poziomów zagrożeń
    const threatLevelBreakdown: Record<string, number> = {};
    for (const log of logs) {
      const level = log.threatLevel;
      threatLevelBreakdown[level] = (threatLevelBreakdown[level] || 0) + 1;
    }

    // Najczęściej atakowane ścieżki (top 10)
    const pathCount: Record<string, number> = {};
    for (const log of logs) {
      pathCount[log.path] = (pathCount[log.path] || 0) + 1;
    }
    const topTargetedPaths = Object.entries(pathCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // Rozkład godzinowy (24 godziny)
    const hourlyDistribution = new Array(24).fill(0);
    for (const log of recentLogs) {
      const hour = log.createdAt.getHours();
      hourlyDistribution[hour]++;
    }

    return {
      totalHits: logs.length,
      uniqueIPs: uniqueIPsSet.size,
      last24h: recentLogs.length,
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
      .groupBy('log.ip')
      .having('COUNT(*) >= :minHits', { minHits })
      .orderBy('"hitCount"', 'DESC')
      .getRawMany();

    // Dla każdego IP pobierz unikalne skanery
    const suspiciousIPs: SuspiciousIP[] = [];
    for (const row of result) {
      const scanners = await repo
        .createQueryBuilder('log')
        .select('DISTINCT log.detectedScanner', 'scanner')
        .where('log.ip = :ip AND log.detectedScanner IS NOT NULL', { ip: row.ip })
        .getRawMany();

      suspiciousIPs.push({
        ip: row.ip,
        hitCount: parseInt(row.hitCount, 10),
        scanners: scanners.map((s: any) => s.scanner).filter(Boolean),
        lastSeen: new Date(row.lastSeen),
        threatLevel: row.maxThreatLevel || ThreatLevel.LOW,
      });
    }

    return suspiciousIPs;
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

    // Format CSV
    const headers = [
      'id', 'ip', 'userAgent', 'method', 'path',
      'detectedScanner', 'honeypotType', 'threatLevel',
      'queryParams', 'createdAt', 'reviewed',
    ];
    const rows = logs.map(log => [
      log.id,
      log.ip,
      (log.userAgent || '').replace(/,/g, ';'),
      log.method,
      log.path,
      log.detectedScanner || '',
      log.honeypotType || '',
      log.threatLevel,
      (log.queryParams || '').replace(/,/g, ';'),
      log.createdAt.toISOString(),
      log.reviewed,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csv;
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

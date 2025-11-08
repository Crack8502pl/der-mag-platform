// src/services/IPAllocator.ts
// Serwis alokacji adresów IP

import { AppDataSource } from '../config/database';
import { IPPool } from '../entities/IPPool';

export class IPAllocator {
  /**
   * Alokuje następny dostępny adres IP z puli
   */
  static async allocateIP(poolId: number): Promise<string> {
    const poolRepository = AppDataSource.getRepository(IPPool);
    
    const pool = await poolRepository.findOne({
      where: { id: poolId, active: true }
    });

    if (!pool) {
      throw new Error('Pula IP nie znaleziona');
    }

    // Pobierz następny dostępny adres
    const nextIP = this.getNextAvailableIP(pool);
    
    if (!nextIP) {
      throw new Error('Brak dostępnych adresów IP w puli');
    }

    // Dodaj do listy przydzielonych adresów
    pool.allocatedAddresses = [...pool.allocatedAddresses, nextIP];
    await poolRepository.save(pool);

    return nextIP;
  }

  /**
   * Zwalnia adres IP
   */
  static async releaseIP(poolId: number, ipAddress: string): Promise<void> {
    const poolRepository = AppDataSource.getRepository(IPPool);
    
    const pool = await poolRepository.findOne({
      where: { id: poolId }
    });

    if (!pool) {
      throw new Error('Pula IP nie znaleziona');
    }

    // Usuń adres z listy przydzielonych
    pool.allocatedAddresses = pool.allocatedAddresses.filter(ip => ip !== ipAddress);
    await poolRepository.save(pool);
  }

  /**
   * Oblicza następny dostępny adres IP
   */
  private static getNextAvailableIP(pool: IPPool): string | null {
    const firstIP = this.ipToNumber(pool.firstIp);
    const lastIP = this.ipToNumber(pool.lastIp);
    const allocatedSet = new Set(pool.allocatedAddresses);

    for (let ipNum = firstIP; ipNum <= lastIP; ipNum++) {
      const ip = this.numberToIp(ipNum);
      if (!allocatedSet.has(ip)) {
        return ip;
      }
    }

    return null;
  }

  /**
   * Konwertuje adres IP na liczbę
   */
  private static ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }

  /**
   * Konwertuje liczbę na adres IP
   */
  private static numberToIp(num: number): string {
    return [
      (num >>> 24) & 0xFF,
      (num >>> 16) & 0xFF,
      (num >>> 8) & 0xFF,
      num & 0xFF
    ].join('.');
  }

  /**
   * Sprawdza dostępność adresów w puli
   */
  static async getPoolAvailability(poolId: number): Promise<{
    total: number;
    allocated: number;
    available: number;
    utilizationPercent: number;
  }> {
    const poolRepository = AppDataSource.getRepository(IPPool);
    
    const pool = await poolRepository.findOne({
      where: { id: poolId }
    });

    if (!pool) {
      throw new Error('Pula IP nie znaleziona');
    }

    const total = pool.totalAddresses;
    const allocated = pool.allocatedAddresses.length;
    const available = total - allocated;
    const utilizationPercent = (allocated / total) * 100;

    return {
      total,
      allocated,
      available,
      utilizationPercent
    };
  }
}

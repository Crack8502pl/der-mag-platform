// src/services/AssetNumberingService.ts
// Serwis generowania unikalnych numerów obiektów w formacie OBJ-XXXXXXMMRR

import { DataSource } from 'typeorm';
import { Asset } from '../entities/Asset';

export class AssetNumberingService {
  constructor(private dataSource: DataSource) {}

  /**
   * Generates a unique asset number in format OBJ-XXXXXXMMRR
   * Thread-safe implementation using database transaction with advisory lock
   *
   * @returns Promise<string> - Generated asset number
   * @throws Error if month capacity exceeded (>999999)
   */
  async generateAssetNumber(): Promise<string> {
    return await this.dataSource.transaction(async (manager) => {
      const assetRepo = manager.getRepository(Asset);

      // Get current month/year
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0'); // 01-12
      const year = String(now.getFullYear()).slice(-2); // Last 2 digits
      const suffix = `${month}${year}`; // e.g., "0426"

      // Acquire a transaction-scoped advisory lock keyed by the numeric MMYY value
      // (e.g., April 2026 → 426). This ensures only one transaction at a time
      // generates a number for the same month/year, preventing duplicate sequences.
      await manager.query('SELECT pg_advisory_xact_lock($1)', [parseInt(suffix, 10)]);

      // Find highest sequence number for current month/year
      const pattern = `OBJ-______${suffix}`;
      const lastAsset = await assetRepo
        .createQueryBuilder('asset')
        .where('asset.assetNumber LIKE :pattern', { pattern })
        .orderBy('asset.assetNumber', 'DESC')
        .take(1)
        .getOne();

      // Extract sequence number
      let sequence = 0;
      if (lastAsset) {
        const seqStr = lastAsset.assetNumber.substring(4, 10); // Extract XXXXXX
        sequence = parseInt(seqStr, 10);
      }

      // Increment
      sequence += 1;

      // Check capacity
      if (sequence > 999999) {
        throw new Error(`Asset number capacity exceeded for ${month}/${year}. Maximum 999,999 assets per month.`);
      }

      // Format: OBJ-XXXXXXMMRR
      const seqPadded = String(sequence).padStart(6, '0');
      const assetNumber = `OBJ-${seqPadded}${suffix}`;

      return assetNumber;
    });
  }

  /**
   * Validates asset number format
   *
   * @param assetNumber - Asset number to validate
   * @returns boolean - True if valid format
   */
  validateAssetNumber(assetNumber: string): boolean {
    const regex = /^OBJ-(?!000000)\d{6}(0[1-9]|1[0-2])\d{2}$/;
    return regex.test(assetNumber);
  }

  /**
   * Parses asset number into components
   *
   * @param assetNumber - Asset number to parse
   * @returns Object with sequence, month, year or null if invalid format
   */
  parseAssetNumber(assetNumber: string): { sequence: number; month: number; year: number } | null {
    if (!this.validateAssetNumber(assetNumber)) {
      return null;
    }

    const sequence = parseInt(assetNumber.substring(4, 10), 10);
    const month = parseInt(assetNumber.substring(10, 12), 10);
    const year = parseInt(assetNumber.substring(12, 14), 10);

    return { sequence, month, year };
  }
}

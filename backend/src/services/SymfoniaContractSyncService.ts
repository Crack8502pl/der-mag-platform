// src/services/SymfoniaContractSyncService.ts
// WAŻNE: Ten serwis TYLKO POBIERA dane z MSSQL Symfonia - nigdy nie zapisuje!
// Data flows ONE WAY: Symfonia MSSQL [SSCommon].[STElements] → PostgreSQL contracts

import * as sql from 'mssql';
import { AppDataSource } from '../config/database';
import { Contract, ContractStatus } from '../entities/Contract';
import { MaterialImport } from '../entities/MaterialImport';

export interface ContractSyncResult {
  success: boolean;
  syncType: 'full' | 'quick';
  startedAt: Date;
  completedAt: Date;
  duration: number; // ms
  stats: {
    totalProcessed: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  errors?: ContractSyncError[];
}

export interface ContractSyncError {
  contractNumber?: string;
  message: string;
}

export interface ContractSyncStatus {
  lastFullSync: Date | null;
  lastQuickSync: Date | null;
  nextScheduledSync: Date;
  isRunning: boolean;
  cronEnabled: boolean;
}

export interface ContractSyncHistory {
  id: number;
  syncType: 'full' | 'quick';
  triggeredBy: 'admin' | 'cron';
  userId?: number;
  startedAt: Date;
  completedAt: Date;
  status: 'success' | 'partial' | 'failed';
  stats: object;
}

interface SymfoniaContractRecord {
  elementId: number;
  guid: string;
  title: string;
  active: boolean;
  accountNo: string;
  description: string;
  shortcut: string;
  position: number;
  lastModified: Date | null;
}

export interface ContractSyncProgress {
  phase: 'fetching' | 'processing' | 'saving' | 'completed';
  current: number;
  total: number;
  percentage: number;
  message: string;
}

type ProgressCallback = (progress: ContractSyncProgress) => void;

const BATCH_SIZE = 50;

// Track running state to prevent concurrent syncs
let isContractSyncRunning = false;

// Progress subscribers
const progressSubscribers = new Set<ProgressCallback>();

function notifyProgress(progress: ContractSyncProgress): void {
  progressSubscribers.forEach((cb) => cb(progress));
}

const getMssqlConfig = (): sql.config => ({
  server: process.env.SYMFONIA_MSSQL_SERVER || '',
  database: process.env.SYMFONIA_MSSQL_DATABASE || '',
  user: process.env.SYMFONIA_MSSQL_USER || '',
  password: process.env.SYMFONIA_MSSQL_PASSWORD || '',
  port: parseInt(process.env.SYMFONIA_MSSQL_PORT || '1433', 10),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 300000,
});

/**
 * Usuwa NULL bytes (0x00) z tekstu - PostgreSQL nie akceptuje ich w polach tekstowych
 */
function sanitizeString(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\x00/g, '').trim();
}

/**
 * Wyciąga numer kontraktu z pola Shortcut.
 * Format: RXXXXXXX_Y (7 cyfr + podkreślnik + wielka litera)
 * Przykład: "R0010125_A konserwacja" → "R0010125_A"
 */
function parseContractNumber(shortcut: string): string | null {
  const match = shortcut.match(/R\d{7}_[A-Z]/);
  return match ? match[0] : null;
}

/**
 * Wyciąga kody pracowników z pola Description.
 * Kody to 2-4 znakowe sekwencje wielkich liter.
 * Przykłady: "KOS" → ["KOS"], "NLE JPI" → ["NLE", "JPI"]
 */
function parseEmployeeCodes(description: string): string[] {
  if (!description) return [];
  const matches = description.match(/\b[A-Z]{2,4}\b/g);
  return matches || [];
}

export class SymfoniaContractSyncService {
  /**
   * Subskrypcja na aktualizacje progressu synchronizacji
   */
  static subscribeToProgress(cb: ProgressCallback): void {
    progressSubscribers.add(cb);
  }

  static unsubscribeFromProgress(cb: ProgressCallback): void {
    progressSubscribers.delete(cb);
  }

  /**
   * Pełna synchronizacja kontraktów (Admin - ręcznie)
   * Pobiera: [SSCommon].[STElements] WHERE ElementKindId = 128 → contracts
   * READ-ONLY from MSSQL
   */
  static async fullSync(userId: number): Promise<ContractSyncResult> {
    if (isContractSyncRunning) {
      throw new Error('Synchronizacja kontraktów jest już uruchomiona');
    }
    isContractSyncRunning = true;
    const startedAt = new Date();
    const errors: ContractSyncError[] = [];
    let stats: ContractSyncResult['stats'] = { totalProcessed: 0, created: 0, updated: 0, skipped: 0, errors: 0 };

    try {
      notifyProgress({ phase: 'fetching', current: 0, total: 0, percentage: 0, message: 'Pobieranie kontraktów z Symfonii...' });
      const data = await SymfoniaContractSyncService.fetchSymfoniaContractData();
      stats.totalProcessed = data.length;

      const upsertStats = await SymfoniaContractSyncService.upsertContracts(data, errors, notifyProgress);
      stats.created = upsertStats.created;
      stats.updated = upsertStats.updated;
      stats.skipped = upsertStats.skipped;
      stats.errors = upsertStats.errors;

      const completedAt = new Date();
      const result: ContractSyncResult = {
        success: stats.errors === 0,
        syncType: 'full',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        stats,
        errors: errors.length > 0 ? errors : undefined,
      };

      await SymfoniaContractSyncService.logSync(result, userId, 'admin');
      notifyProgress({ phase: 'completed', current: stats.totalProcessed, total: stats.totalProcessed, percentage: 100, message: 'Synchronizacja kontraktów zakończona!' });
      return result;
    } catch (error) {
      const completedAt = new Date();
      const msg = error instanceof Error ? error.message : String(error);
      errors.push({ message: msg });
      stats.errors += 1;
      const result: ContractSyncResult = {
        success: false,
        syncType: 'full',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        stats,
        errors,
      };
      await SymfoniaContractSyncService.logSync(result, userId, 'admin').catch(() => {});
      throw error;
    } finally {
      isContractSyncRunning = false;
    }
  }

  /**
   * Szybka synchronizacja kontraktów (aktualizacja statusów Active)
   * READ-ONLY from MSSQL
   */
  static async quickSync(): Promise<ContractSyncResult> {
    if (isContractSyncRunning) {
      throw new Error('Synchronizacja kontraktów jest już uruchomiona');
    }
    isContractSyncRunning = true;
    const startedAt = new Date();
    const errors: ContractSyncError[] = [];
    let stats: ContractSyncResult['stats'] = { totalProcessed: 0, created: 0, updated: 0, skipped: 0, errors: 0 };

    try {
      const data = await SymfoniaContractSyncService.fetchSymfoniaContractData();
      stats.totalProcessed = data.length;

      const quickStats = await SymfoniaContractSyncService.updateStatusesOnly(data, errors);
      stats.updated = quickStats.updated;
      stats.skipped = quickStats.skipped;
      stats.errors = quickStats.errors;

      const completedAt = new Date();
      const result: ContractSyncResult = {
        success: stats.errors === 0,
        syncType: 'quick',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        stats,
        errors: errors.length > 0 ? errors : undefined,
      };

      await SymfoniaContractSyncService.logSync(result, undefined, 'cron');
      return result;
    } catch (error) {
      const completedAt = new Date();
      const msg = error instanceof Error ? error.message : String(error);
      errors.push({ message: msg });
      stats.errors += 1;
      const result: ContractSyncResult = {
        success: false,
        syncType: 'quick',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        stats,
        errors,
      };
      await SymfoniaContractSyncService.logSync(result, undefined, 'cron').catch(() => {});
      throw error;
    } finally {
      isContractSyncRunning = false;
    }
  }

  /**
   * Pobiera dane kontraktów z Symfonii (READ-ONLY!)
   * SELECT z [SSCommon].[STElements] WHERE ElementKindId = 128
   */
  static async fetchSymfoniaContractData(): Promise<SymfoniaContractRecord[]> {
    let pool: sql.ConnectionPool | null = null;
    try {
      pool = await sql.connect(getMssqlConfig());
      // READ-ONLY SELECT - nigdy INSERT/UPDATE/DELETE na MSSQL
      const result = await pool.request().query(`
        SELECT
          ElementId,
          CAST(Guid AS NVARCHAR(36)) AS Guid,
          Title,
          Active,
          AccountNo,
          Description,
          Shortcut,
          Position,
          st_last_modified
        FROM [SSCommon].[STElements]
        WHERE ElementKindId = 128
        ORDER BY Shortcut
      `);

      return result.recordset.map((row: any) => ({
        elementId: Number(row.ElementId),
        guid: sanitizeString(row.Guid),
        title: sanitizeString(row.Title),
        active: Boolean(row.Active),
        accountNo: sanitizeString(row.AccountNo),
        description: sanitizeString(row.Description),
        shortcut: sanitizeString(row.Shortcut),
        position: Number(row.Position) || 0,
        lastModified: row.st_last_modified ? new Date(row.st_last_modified) : null,
      }));
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }

  /**
   * Zapisuje/aktualizuje kontrakty w PostgreSQL (upsert) - batch processing
   */
  private static async upsertContracts(
    data: SymfoniaContractRecord[],
    errors: ContractSyncError[],
    onProgress?: ProgressCallback
  ): Promise<{ created: number; updated: number; skipped: number; errors: number }> {
    const contractRepo = AppDataSource.getRepository(Contract);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errorCount = 0;

    const total = data.length;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);

      if (onProgress) {
        onProgress({
          phase: 'processing',
          current: Math.min(i + BATCH_SIZE, total),
          total,
          percentage: Math.round((Math.min(i + BATCH_SIZE, total) / total) * 100),
          message: `Przetwarzanie ${Math.min(i + BATCH_SIZE, total)}/${total} kontraktów...`,
        });
      }

      // Parsuj numery kontraktów dla całego batcha
      const batchWithNumbers = batch.map((item) => ({
        item,
        contractNumber: parseContractNumber(item.shortcut),
        employeeCodes: parseEmployeeCodes(item.description),
      }));

      // Pobierz istniejące rekordy jednym zapytaniem
      const contractNumbers = batchWithNumbers
        .map((b) => b.contractNumber)
        .filter((cn): cn is string => cn !== null && cn !== '');

      const existingRecords = contractNumbers.length > 0
        ? await contractRepo
            .createQueryBuilder('c')
            .where('c.contractNumber IN (:...contractNumbers)', { contractNumbers })
            .getMany()
        : [];

      const existingMap = new Map(existingRecords.map((r) => [r.contractNumber, r]));

      for (const { item, contractNumber, employeeCodes } of batchWithNumbers) {
        try {
          if (!contractNumber) {
            skipped++;
            continue;
          }

          const status = item.active ? ContractStatus.ACTIVE : ContractStatus.INACTIVE;
          const managerCode = employeeCodes.length > 0 ? employeeCodes[0] : null;

          const technicalSpecs = {
            symfonia_element_id: item.elementId,
            guid: item.guid,
            account_no: item.accountNo,
            description: item.description,
            employee_codes: employeeCodes,
            shortcut: item.shortcut,
            position: item.position,
            last_modified: item.lastModified,
          };

          const existing = existingMap.get(contractNumber);

          if (existing) {
            existing.customName = item.title || existing.customName;
            existing.managerCode = managerCode ?? existing.managerCode;
            existing.status = status;
            existing.technicalSpecs = { ...existing.technicalSpecs, ...technicalSpecs };
            await contractRepo.save(existing);
            updated++;
          } else {
            const contract = contractRepo.create({
              contractNumber,
              customName: item.title || contractNumber,
              managerCode,
              status,
              orderDate: item.lastModified ?? null,
              projectManagerId: null,
              technicalSpecs,
            });
            await contractRepo.save(contract);
            created++;
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          errors.push({ contractNumber: contractNumber ?? undefined, message: msg });
          errorCount++;
        }
      }
    }

    return { created, updated, skipped, errors: errorCount };
  }

  /**
   * Aktualizuje tylko statusy Active kontraktów (szybka synchronizacja)
   */
  private static async updateStatusesOnly(
    data: SymfoniaContractRecord[],
    errors: ContractSyncError[]
  ): Promise<{ updated: number; skipped: number; errors: number }> {
    const contractRepo = AppDataSource.getRepository(Contract);
    let updated = 0;
    let skipped = 0;
    let errorCount = 0;

    // Parse all contract numbers up front
    const items = data.map((item) => ({
      item,
      contractNumber: parseContractNumber(item.shortcut),
    }));

    // Fetch all relevant contracts in one query
    const contractNumbers = items
      .map((i) => i.contractNumber)
      .filter((cn): cn is string => cn !== null && cn !== '');

    if (contractNumbers.length === 0) {
      return { updated: 0, skipped: data.length, errors: 0 };
    }

    const existingRecords = await contractRepo
      .createQueryBuilder('c')
      .where('c.contractNumber IN (:...contractNumbers)', { contractNumbers })
      .getMany();

    const existingMap = new Map(existingRecords.map((r) => [r.contractNumber, r]));

    for (const { item, contractNumber } of items) {
      try {
        if (!contractNumber) {
          skipped++;
          continue;
        }

        const existing = existingMap.get(contractNumber);
        if (!existing) {
          skipped++;
          continue;
        }

        const newStatus = item.active ? ContractStatus.ACTIVE : ContractStatus.INACTIVE;
        if (existing.status !== newStatus) {
          existing.status = newStatus;
          await contractRepo.save(existing);
          updated++;
        } else {
          skipped++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push({ message: msg });
        errorCount++;
      }
    }

    return { updated, skipped, errors: errorCount };
  }

  private static determineSyncStatus(result: ContractSyncResult): string {
    if (result.success) return 'completed';
    if (result.stats.errors > 0 && result.stats.errors < result.stats.totalProcessed) return 'partial';
    return 'failed';
  }

  /**
   * Loguje wynik synchronizacji do tabeli material_imports
   */
  private static async logSync(
    result: ContractSyncResult,
    userId: number | undefined,
    triggeredBy: 'admin' | 'cron'
  ): Promise<void> {
    try {
      const importRepo = AppDataSource.getRepository(MaterialImport);
      const syncLabel = result.syncType === 'full' ? 'SYMFONIA_CONTRACTS_FULL' : 'SYMFONIA_CONTRACTS_QUICK';
      const timestamp = result.startedAt.toISOString().replace('T', ' ').substring(0, 19);

      const importLog = importRepo.create({
        filename: `${syncLabel.toLowerCase()}-${result.startedAt.toISOString()}`,
        status: SymfoniaContractSyncService.determineSyncStatus(result),
        totalRows: result.stats.totalProcessed,
        newItems: result.stats.created,
        existingItems: result.stats.updated,
        errorItems: result.stats.errors,
        importedById: userId,
        diffPreview: {
          syncType: result.syncType,
          triggeredBy,
          duration: result.duration,
          stats: result.stats,
          errors: result.errors,
          timestamp,
        },
      });

      await importRepo.save(importLog);
    } catch (err) {
      console.error('❌ SymfoniaContractSyncService.logSync() ERROR:', err);
    }
  }

  /**
   * Zwraca status ostatniej synchronizacji kontraktów
   */
  static async getStatus(): Promise<ContractSyncStatus> {
    const importRepo = AppDataSource.getRepository(MaterialImport);

    const [lastFullRecord, lastQuickRecord] = await Promise.all([
      importRepo
        .createQueryBuilder('i')
        .where("i.filename LIKE 'symfonia_contracts_full-%'")
        .orderBy('i.createdAt', 'DESC')
        .getOne(),
      importRepo
        .createQueryBuilder('i')
        .where("i.filename LIKE 'symfonia_contracts_quick-%'")
        .orderBy('i.createdAt', 'DESC')
        .getOne(),
    ]);

    const now = new Date();
    const nextSync = new Date(now);
    nextSync.setMinutes(0, 0, 0);
    nextSync.setHours(nextSync.getHours() + 1);

    return {
      lastFullSync: lastFullRecord?.createdAt ?? null,
      lastQuickSync: lastQuickRecord?.createdAt ?? null,
      nextScheduledSync: nextSync,
      isRunning: isContractSyncRunning,
      cronEnabled: process.env.SYMFONIA_SYNC_ENABLED !== 'false',
    };
  }

  /**
   * Zwraca historię synchronizacji kontraktów
   */
  static async getHistory(limit: number = 10): Promise<ContractSyncHistory[]> {
    const importRepo = AppDataSource.getRepository(MaterialImport);

    const records = await importRepo
      .createQueryBuilder('i')
      .where("i.filename LIKE 'symfonia_contracts_%'")
      .orderBy('i.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return records.map((r) => {
      const meta = (r.diffPreview as any) || {};
      const syncType: 'full' | 'quick' = r.filename.startsWith('symfonia_contracts_full') ? 'full' : 'quick';
      const importStatus = r.status === 'completed' ? 'success' : r.status === 'partial' ? 'partial' : 'failed';

      return {
        id: r.id,
        syncType,
        triggeredBy: meta.triggeredBy || 'cron',
        userId: r.importedById,
        startedAt: r.createdAt,
        completedAt: r.confirmedAt ?? r.createdAt,
        status: importStatus as 'success' | 'partial' | 'failed',
        stats: meta.stats || {},
      };
    });
  }
}

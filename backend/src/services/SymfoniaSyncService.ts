// src/services/SymfoniaSyncService.ts
// WAŻNE: Ten serwis TYLKO POBIERA dane z MSSQL Symfonia - nigdy nie zapisuje!
// Data flows ONE WAY: Symfonia MSSQL → PostgreSQL (never the other direction)

import * as sql from 'mssql';
import { AppDataSource } from '../config/database';
import { WarehouseStock, MaterialType, StockStatus } from '../entities/WarehouseStock';
import { WarehouseStockHistory, StockOperationType } from '../entities/WarehouseStockHistory';
import { MaterialImport } from '../entities/MaterialImport';
import { warehouseSyncLogger } from '../utils/logger';

export interface SyncResult {
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
    reactivated?: number;
    outOfStock?: number;
    deactivated?: number;
  };
  errors?: SyncError[];
}

export interface SyncError {
  catalogNumber?: string;
  message: string;
}

export interface SyncStatus {
  lastFullSync: Date | null;
  lastQuickSync: Date | null;
  nextScheduledSync: Date;
  isRunning: boolean;
  cronEnabled: boolean;
}

export interface SyncHistory {
  id: number;
  syncType: 'full' | 'quick';
  triggeredBy: 'admin' | 'cron';
  userId?: number;
  startedAt: Date;
  completedAt: Date;
  status: 'success' | 'partial' | 'failed';
  stats: object;
}

interface SymfoniaProduct {
  symfoniaTwId: number;
  catalogNumber: string;
  materialName: string;
  unit: string;
  productType: string;
  minStockLevel: number | null;
  maxStockLevel: number | null;
  isActive: boolean;
  barcode: string | null;
  quantityInStock: number;
  stockValue: number | null;
  warehouseId: string | null;
  unitPrice: number | null;
  lastGuid: string | null;
}

interface SymfoniaQuickStock {
  catalogNumber: string;
  quantityInStock: number;
  warehouseId: string | null;
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

export interface SyncProgress {
  phase: 'fetching' | 'processing' | 'saving' | 'completed';
  current: number;
  total: number;
  percentage: number;
  message: string;
}

type ProgressCallback = (progress: SyncProgress) => void;

const BATCH_SIZE = 50;

// Track running state to prevent concurrent syncs
let isSyncRunning = false;

// Progress subscribers
const progressSubscribers = new Set<ProgressCallback>();

function notifyProgress(progress: SyncProgress): void {
  progressSubscribers.forEach((cb) => cb(progress));
}

export class SymfoniaSyncService {
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
   * Pełna synchronizacja (Admin - ręcznie)
   * Pobiera: TW + SM + MZ → warehouse_stock
   * READ-ONLY from MSSQL
   */
  static async fullSync(userId: number): Promise<SyncResult> {
    if (isSyncRunning) {
      throw new Error('Synchronizacja jest już uruchomiona');
    }
    isSyncRunning = true;
    const startedAt = new Date();
    const errors: SyncError[] = [];
    let stats: SyncResult['stats'] = { totalProcessed: 0, created: 0, updated: 0, skipped: 0, errors: 0 };

    try {
      notifyProgress({ phase: 'fetching', current: 0, total: 0, percentage: 0, message: 'Pobieranie danych z Symfonii...' });
      const data = await SymfoniaSyncService.fetchSymfoniaData();
      stats.totalProcessed = data.length;
      const upsertStats = await SymfoniaSyncService.upsertToWarehouseStock(data, errors, notifyProgress);
      stats.created = upsertStats.created;
      stats.updated = upsertStats.updated;
      stats.skipped = upsertStats.skipped;
      stats.errors = upsertStats.errors;
      stats.reactivated = upsertStats.reactivated;
      stats.outOfStock = upsertStats.outOfStock;

      const completedAt = new Date();
      const result: SyncResult = {
        success: stats.errors === 0,
        syncType: 'full',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        stats,
        errors: errors.length > 0 ? errors : undefined,
      };

      await SymfoniaSyncService.logSync(result, userId, 'admin');
      notifyProgress({ phase: 'completed', current: stats.totalProcessed, total: stats.totalProcessed, percentage: 100, message: 'Synchronizacja zakończona!' });
      return result;
    } catch (error) {
      const completedAt = new Date();
      const msg = error instanceof Error ? error.message : String(error);
      errors.push({ message: msg });
      stats.errors += 1;
      const result: SyncResult = {
        success: false,
        syncType: 'full',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        stats,
        errors,
      };
      await SymfoniaSyncService.logSync(result, userId, 'admin').catch(() => {});
      throw error;
    } finally {
      isSyncRunning = false;
    }
  }

  /**
   * Szybka synchronizacja ilości (CRON - co 1h)
   * Pobiera tylko: SM.stan → warehouse_stock.quantity_in_stock
   * READ-ONLY from MSSQL
   */
  static async quickStockSync(): Promise<SyncResult> {
    if (isSyncRunning) {
      throw new Error('Synchronizacja jest już uruchomiona');
    }
    isSyncRunning = true;
    const startedAt = new Date();
    const errors: SyncError[] = [];
    let stats: SyncResult['stats'] = { totalProcessed: 0, created: 0, updated: 0, skipped: 0, errors: 0, reactivated: 0, outOfStock: 0 };

    try {
      const data = await SymfoniaSyncService.fetchQuickStockData();
      stats.totalProcessed = data.length;
      const quickStats = await SymfoniaSyncService.updateQuantitiesOnly(data, errors);
      stats.updated = quickStats.updated;
      stats.skipped = quickStats.skipped;
      stats.errors = quickStats.errors;
      stats.reactivated = quickStats.reactivated;
      stats.outOfStock = quickStats.outOfStock;

      const completedAt = new Date();
      const result: SyncResult = {
        success: stats.errors === 0,
        syncType: 'quick',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        stats,
        errors: errors.length > 0 ? errors : undefined,
      };

      await SymfoniaSyncService.logSync(result, undefined, 'cron');
      return result;
    } catch (error) {
      const completedAt = new Date();
      const msg = error instanceof Error ? error.message : String(error);
      errors.push({ message: msg });
      stats.errors += 1;
      const result: SyncResult = {
        success: false,
        syncType: 'quick',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        stats,
        errors,
      };
      await SymfoniaSyncService.logSync(result, undefined, 'cron').catch(() => {});
      throw error;
    } finally {
      isSyncRunning = false;
    }
  }

  /**
   * Pobiera pełne dane z Symfonii (READ-ONLY!)
   * Łączy tabele TW + SM + MZ
   */
  private static async fetchSymfoniaData(): Promise<SymfoniaProduct[]> {
    let pool: sql.ConnectionPool | null = null;
    try {
      pool = await sql.connect(getMssqlConfig());
      // PEŁNA SYNCHRONIZACJA - tylko SELECT, nigdy INSERT/UPDATE/DELETE na MSSQL
      const result = await pool.request().query(`
        WITH LatestMZ AS (
          SELECT
            idtw,
            opis,
            cena,
            guid,
            ROW_NUMBER() OVER (PARTITION BY idtw ORDER BY data DESC) as rn
          FROM [HM].[MZ]
          WHERE LEN(opis) > 0 OR cena > 0
        ),
        AggregatedStock AS (
          SELECT
            idtw,
            SUM(stan) AS total_quantity,
            SUM(wartosc) AS total_value,
            STRING_AGG(CAST(magazyn AS NVARCHAR(100)), ',') AS warehouse_ids
          FROM [HM].[SM]
          GROUP BY idtw
        )
        SELECT
          tw.id AS symfonia_tw_id,
          tw.kod AS catalog_number,
          COALESCE(mz.opis, tw.nazwa) AS material_name,
          tw.jm AS unit,
          tw.typks AS product_type,
          tw.stanmin AS min_stock_level,
          tw.stanmax AS max_stock_level,
          tw.aktywny AS is_active,
          tw.kodpaskowy AS barcode,
          agg.total_quantity AS quantity_in_stock,
          agg.total_value AS stock_value,
          agg.warehouse_ids AS warehouse_id,
          mz.cena AS unit_price,
          mz.guid AS last_guid
        FROM [HM].[TW] tw
        INNER JOIN AggregatedStock agg ON tw.id = agg.idtw
        LEFT JOIN LatestMZ mz ON mz.idtw = tw.id AND mz.rn = 1
        WHERE tw.typks = 'Towar'
        ORDER BY tw.kod
      `);

      return result.recordset.map((row: any) => ({
        symfoniaTwId: row.symfonia_tw_id,
        catalogNumber: sanitizeString(row.catalog_number),
        materialName: sanitizeString(row.material_name),
        unit: sanitizeString(row.unit) || 'szt',
        productType: sanitizeString(row.product_type),
        minStockLevel: row.min_stock_level != null ? Number(row.min_stock_level) : null,
        maxStockLevel: row.max_stock_level != null ? Number(row.max_stock_level) : null,
        isActive: Boolean(row.is_active),
        barcode: row.barcode ? sanitizeString(row.barcode) : null,
        quantityInStock: Number(row.quantity_in_stock) || 0,
        stockValue: row.stock_value != null ? Number(row.stock_value) : null,
        warehouseId: row.warehouse_id ? sanitizeString(row.warehouse_id) : null,
        unitPrice: row.unit_price != null ? Number(row.unit_price) : null,
        lastGuid: row.last_guid ? sanitizeString(row.last_guid) : null,
      }));
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }

  /**
   * Pobiera tylko stany ilościowe z Symfonii (READ-ONLY!)
   * Dla szybkiej synchronizacji CRON
   */
  private static async fetchQuickStockData(): Promise<SymfoniaQuickStock[]> {
    let pool: sql.ConnectionPool | null = null;
    try {
      pool = await sql.connect(getMssqlConfig());
      // SZYBKA SYNCHRONIZACJA - tylko SELECT, nigdy INSERT/UPDATE/DELETE na MSSQL
      const result = await pool.request().query(`
        SELECT
          tw.kod AS catalog_number,
          SUM(sm.stan) AS quantity_in_stock,
          STRING_AGG(CAST(sm.magazyn AS NVARCHAR(100)), ',') AS warehouse_id
        FROM [HM].[TW] tw
        INNER JOIN [HM].[SM] sm ON tw.id = sm.idtw
        WHERE tw.typks = 'Towar'
        GROUP BY tw.kod
      `);

      return result.recordset.map((row: any) => ({
        catalogNumber: sanitizeString(row.catalog_number),
        quantityInStock: Number(row.quantity_in_stock) || 0,
        warehouseId: row.warehouse_id ? sanitizeString(row.warehouse_id) : null,
      }));
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }

  /**
   * Zapisuje do PostgreSQL (upsert) - pełna synchronizacja z batch processing.
   * Dla istniejących rekordów aktualizuje TYLKO stan magazynowy (quantityInStock)
   * wraz z logiką reaktywacji/OUT_OF_STOCK opartą na zmianie ilości.
   * Dla nowych rekordów tworzy pełny wpis.
   */
  private static async upsertToWarehouseStock(
    data: SymfoniaProduct[],
    errors: SyncError[],
    onProgress?: ProgressCallback
  ): Promise<{ created: number; updated: number; skipped: number; errors: number; reactivated: number; outOfStock: number }> {
    const stockRepo = AppDataSource.getRepository(WarehouseStock);
    const historyRepo = AppDataSource.getRepository(WarehouseStockHistory);
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errorCount = 0;
    let reactivated = 0;
    let outOfStock = 0;

    // Deduplicate: remove duplicate catalogNumbers from input data (last one wins)
    const uniqueData = new Map<string, SymfoniaProduct>();
    for (const item of data) {
      if (item.catalogNumber) {
        uniqueData.set(item.catalogNumber, item);
      } else {
        skipped++;
      }
    }

    const deduplicatedData = Array.from(uniqueData.values());
    const duplicatesRemoved = data.length - deduplicatedData.length - skipped;

    if (duplicatesRemoved > 0) {
      warehouseSyncLogger.warn(`⚠️ Usunięto ${duplicatesRemoved} duplikatów z danych Symfonii`);
    }

    const total = deduplicatedData.length;

    // Przetwarzanie w batchach
    for (let i = 0; i < deduplicatedData.length; i += BATCH_SIZE) {
      const batch = deduplicatedData.slice(i, i + BATCH_SIZE);

      // Raportuj progress
      if (onProgress) {
        onProgress({
          phase: 'processing',
          current: Math.min(i + BATCH_SIZE, total),
          total,
          percentage: Math.round((Math.min(i + BATCH_SIZE, total) / total) * 100),
          message: `Przetwarzanie ${Math.min(i + BATCH_SIZE, total)}/${total} rekordów...`,
        });
      }

      // Pobierz wszystkie istniejące rekordy dla batcha jednym zapytaniem
      const catalogNumbers = batch.map((item) => item.catalogNumber).filter((cn) => cn != null && cn !== '');

      const existingRecords = catalogNumbers.length > 0
        ? await stockRepo
            .createQueryBuilder('ws')
            .where('ws.catalogNumber IN (:...catalogNumbers)', { catalogNumbers })
            .getMany()
        : [];

      const existingMap = new Map(existingRecords.map((r) => [r.catalogNumber, r]));

      // Przetwórz batch
      for (const item of batch) {
        try {
          if (!item.catalogNumber) {
            skipped++;
            continue;
          }

          const existing = existingMap.get(item.catalogNumber);

          if (existing) {
            // Aktualizacja istniejącego rekordu - stan magazynowy oraz automatyczna zmiana statusu
            // wyłącznie na podstawie zmiany ilości (reaktywacja / OUT_OF_STOCK).
            const oldQuantity = existing.quantityInStock;
            const newQuantity = item.quantityInStock;
            const oldStatus = existing.status;

            existing.quantityInStock = newQuantity;

            // REAKTYWACJA: jeśli stan wzrósł > 0 (z 0) i towar był DISCONTINUED lub OUT_OF_STOCK
            if (newQuantity > 0 && oldQuantity === 0 && (oldStatus === StockStatus.DISCONTINUED || oldStatus === StockStatus.OUT_OF_STOCK)) {
              existing.status = StockStatus.ACTIVE;
              existing.isActive = true;
              reactivated++;

              const historyEntry = historyRepo.create({
                warehouseStockId: existing.id,
                operationType: StockOperationType.STATUS_CHANGE,
                quantityBefore: oldQuantity,
                quantityAfter: newQuantity,
                details: {
                  reason: 'AUTO_REACTIVATION',
                  message: 'Automatyczna reaktywacja - stan wzrósł > 0',
                  previousStatus: oldStatus,
                  newStatus: StockStatus.ACTIVE,
                  source: 'symfonia_sync',
                },
                notes: 'Automatyczna reaktywacja przez synchronizację Symfonia',
              });
              await historyRepo.save(historyEntry);
            }
            // OUT_OF_STOCK: jeśli stan spadł do 0 (z wartości > 0) i towar był ACTIVE
            else if (newQuantity === 0 && oldQuantity > 0 && oldStatus === StockStatus.ACTIVE) {
              existing.status = StockStatus.OUT_OF_STOCK;
              outOfStock++;

              const historyEntry = historyRepo.create({
                warehouseStockId: existing.id,
                operationType: StockOperationType.STATUS_CHANGE,
                quantityBefore: oldQuantity,
                quantityAfter: newQuantity,
                details: {
                  reason: 'ZERO_STOCK',
                  message: 'Stan spadł do 0',
                  previousStatus: oldStatus,
                  newStatus: StockStatus.OUT_OF_STOCK,
                  source: 'symfonia_sync',
                },
                notes: 'Automatyczna zmiana statusu - stan = 0',
              });
              await historyRepo.save(historyEntry);
            }

            await stockRepo.save(existing);
            updated++;
          } else {
            // Nowy wpis - tworzony z pełnymi danymi
            const materialType = MaterialType.COMPONENT;
            const status = item.isActive ? StockStatus.ACTIVE : StockStatus.DISCONTINUED;
            const technicalSpecs = {
              symfonia_tw_id: item.symfoniaTwId,
              last_guid: item.lastGuid,
              warehouse_id: item.warehouseId,
              barcode: item.barcode,
              stock_value: item.stockValue,
            };

            const stock = stockRepo.create({
              catalogNumber: item.catalogNumber,
              materialName: item.materialName || item.catalogNumber,
              unit: item.unit || 'szt',
              materialType,
              minStockLevel: item.minStockLevel ?? undefined,
              maxStockLevel: item.maxStockLevel ?? undefined,
              quantityInStock: item.quantityInStock,
              unitPrice: item.unitPrice ?? undefined,
              warehouseLocation: item.warehouseId ?? undefined,
              status,
              isActive: item.isActive,
              technicalSpecs,
            });
            await stockRepo.save(stock);
            warehouseSyncLogger.info(`➕ Nowy wpis: ${item.catalogNumber} — ${item.materialName}`);
            created++;
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          errors.push({ catalogNumber: item.catalogNumber, message: msg });
          errorCount++;
        }
      }
    }

    if (created > 0) {
      warehouseSyncLogger.info(`✅ Pełna synchronizacja: dodano ${created} nowych wpisów`);
    }

    return { created, updated, skipped, errors: errorCount, reactivated, outOfStock };
  }

  /**
   * Aktualizuje tylko ilości w PostgreSQL (szybka synchronizacja)
   */
  private static async updateQuantitiesOnly(
    data: SymfoniaQuickStock[],
    errors: SyncError[]
  ): Promise<{ updated: number; skipped: number; errors: number; reactivated: number; outOfStock: number }> {
    const stockRepo = AppDataSource.getRepository(WarehouseStock);
    const historyRepo = AppDataSource.getRepository(WarehouseStockHistory);
    let updated = 0;
    let skipped = 0;
    let errorCount = 0;
    let reactivated = 0;
    let outOfStock = 0;

    for (const item of data) {
      try {
        if (!item.catalogNumber) {
          skipped++;
          continue;
        }

        const existing = await stockRepo.findOne({ where: { catalogNumber: item.catalogNumber } });

        if (!existing) {
          warehouseSyncLogger.info(`⏭️ Pominięto (brak w PostgreSQL): ${item.catalogNumber}`);
          skipped++;
          continue;
        }

        const oldQuantity = existing.quantityInStock;
        const newQuantity = item.quantityInStock;
        const oldStatus = existing.status;

        existing.quantityInStock = newQuantity;

        // REAKTYWACJA: jeśli stan wzrósł > 0 (z 0) i towar był DISCONTINUED lub OUT_OF_STOCK
        if (newQuantity > 0 && oldQuantity === 0 && (oldStatus === StockStatus.DISCONTINUED || oldStatus === StockStatus.OUT_OF_STOCK)) {
          existing.status = StockStatus.ACTIVE;
          existing.isActive = true;
          reactivated++;

          const historyEntry = historyRepo.create({
            warehouseStockId: existing.id,
            operationType: StockOperationType.STATUS_CHANGE,
            quantityBefore: oldQuantity,
            quantityAfter: newQuantity,
            details: {
              reason: 'AUTO_REACTIVATION',
              message: 'Automatyczna reaktywacja - stan wzrósł > 0',
              previousStatus: oldStatus,
              newStatus: StockStatus.ACTIVE,
              source: 'symfonia_sync',
            },
            notes: 'Automatyczna reaktywacja przez synchronizację Symfonia',
          });
          await historyRepo.save(historyEntry);
        }
        // OUT_OF_STOCK: jeśli stan spadł do 0 (z wartości > 0) i towar był ACTIVE
        else if (newQuantity === 0 && oldQuantity > 0 && oldStatus === StockStatus.ACTIVE) {
          existing.status = StockStatus.OUT_OF_STOCK;
          outOfStock++;

          const historyEntry = historyRepo.create({
            warehouseStockId: existing.id,
            operationType: StockOperationType.STATUS_CHANGE,
            quantityBefore: oldQuantity,
            quantityAfter: newQuantity,
            details: {
              reason: 'ZERO_STOCK',
              message: 'Stan spadł do 0',
              previousStatus: oldStatus,
              newStatus: StockStatus.OUT_OF_STOCK,
              source: 'symfonia_sync',
            },
            notes: 'Automatyczna zmiana statusu - stan = 0',
          });
          await historyRepo.save(historyEntry);
        }

        await stockRepo.save(existing);
        updated++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push({ catalogNumber: item.catalogNumber, message: msg });
        errorCount++;
      }
    }

    return { updated, skipped, errors: errorCount, reactivated, outOfStock };
  }

  private static determineSyncStatus(result: SyncResult): string {
    if (result.success) return 'completed';
    if (result.stats.errors > 0 && result.stats.errors < result.stats.totalProcessed) return 'partial';
    return 'failed';
  }

  /**
   * Loguje wynik synchronizacji do tabeli material_imports
   */
  private static async logSync(
    result: SyncResult,
    userId: number | undefined,
    triggeredBy: 'admin' | 'cron'
  ): Promise<void> {
    try {
      const importRepo = AppDataSource.getRepository(MaterialImport);
      const timestamp = result.startedAt.toISOString().replace('T', ' ').substring(0, 19);

      const importLog = importRepo.create({
        filename: `symfonia_warehouse_${result.syncType}-${result.startedAt.toISOString()}`,
        status: SymfoniaSyncService.determineSyncStatus(result),
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
      warehouseSyncLogger.error('❌ SymfoniaSyncService.logSync() ERROR:', err);
    }
  }

  /**
   * Zwraca status ostatniej synchronizacji
   */
  static async getStatus(): Promise<SyncStatus> {
    const importRepo = AppDataSource.getRepository(MaterialImport);

    // Query for last full and quick sync
    const [lastFullRecord, lastQuickRecord] = await Promise.all([
      importRepo
        .createQueryBuilder('i')
        .where("i.filename LIKE 'symfonia_warehouse_full-%'")
        .orderBy('i.createdAt', 'DESC')
        .getOne(),
      importRepo
        .createQueryBuilder('i')
        .where("i.filename LIKE 'symfonia_warehouse_quick-%'")
        .orderBy('i.createdAt', 'DESC')
        .getOne(),
    ]);

    // Calculate next scheduled sync (next hour)
    const now = new Date();
    const nextSync = new Date(now);
    nextSync.setMinutes(0, 0, 0);
    nextSync.setHours(nextSync.getHours() + 1);

    return {
      lastFullSync: lastFullRecord?.createdAt ?? null,
      lastQuickSync: lastQuickRecord?.createdAt ?? null,
      nextScheduledSync: nextSync,
      isRunning: isSyncRunning,
      cronEnabled: process.env.SYMFONIA_SYNC_ENABLED !== 'false',
    };
  }

  /**
   * Zwraca historię synchronizacji (ostatnie 10)
   */
  static async getHistory(limit: number = 10): Promise<SyncHistory[]> {
    const importRepo = AppDataSource.getRepository(MaterialImport);

    const records = await importRepo
      .createQueryBuilder('i')
      .where("i.filename LIKE 'symfonia_warehouse_%'")
      .orderBy('i.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return records.map((r) => {
      const meta = (r.diffPreview as any) || {};
      const syncType: 'full' | 'quick' = r.filename.startsWith('symfonia_warehouse_full') ? 'full' : 'quick';
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

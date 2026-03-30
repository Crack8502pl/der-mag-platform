// src/services/SymfoniaCarSyncService.ts
// WAŻNE: Ten serwis TYLKO POBIERA dane z MSSQL Symfonia - nigdy nie zapisuje!
// Data flows ONE WAY: Symfonia MSSQL [SSCommon].[STElements] (ElementKindId=128) → PostgreSQL cars

import * as sql from 'mssql';
import { AppDataSource } from '../config/database';
import { Car } from '../entities/Car';
import { MaterialImport } from '../entities/MaterialImport';
import { BrigadeService } from './BrigadeService';

// Guard against concurrent sync runs
let isCarSyncRunning = false;

export interface CarSyncResult {
  success: boolean;
  syncType: 'full';
  startedAt: Date;
  completedAt: Date;
  duration: number;
  stats: {
    totalProcessed: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    archived: number;
  };
  errors: Array<{ message: string }>;
}

export interface CarSyncStatus {
  lastFullSync: Date | null;
  lastQuickSync: Date | null;
  nextScheduledSync: Date;
  isRunning: boolean;
  cronEnabled: boolean;
}

export interface CarSyncHistory {
  id: number;
  syncType: 'full' | 'quick';
  triggeredBy: 'admin' | 'cron';
  userId?: number;
  startedAt: Date;
  completedAt: Date;
  status: 'success' | 'partial' | 'failed';
  stats: object;
}

interface SymfoniaCarRecord {
  elementId: number;
  title: string;
  active: boolean;
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
  requestTimeout: 60000,
});

export class SymfoniaCarSyncService {
  /**
   * Pobiera dane samochodów z Symfonii (READ-ONLY!)
   * SELECT z [SSCommon].[STElements] WHERE ElementKindId = 128
   */
  static async fetchSymfoniaCarData(): Promise<SymfoniaCarRecord[]> {
    let pool: sql.ConnectionPool | null = null;
    try {
      pool = await sql.connect(getMssqlConfig());
      const result = await pool.request().query(`
        SELECT
          ElementId,
          Title,
          Active
        FROM [SSCommon].[STElements]
        WHERE ElementKindId = 128
        ORDER BY Title
      `);

      return result.recordset.map((row: any) => ({
        elementId: Number(row.ElementId),
        title: String(row.Title || '').replace(/\x00/g, '').trim(),
        active: Boolean(row.Active),
      }));
    } finally {
      if (pool) await pool.close();
    }
  }

  /**
   * Parsuje tytuł "S00144 Samochód CB144RX" na LP i rejestrację
   * Zwraca null jeśli format nie pasuje
   */
  static parseCarTitle(title: string): { lp: string; registration: string } | null {
    const match = title.match(/^(S\d+)\s+Samoch[oó]d\s+([A-Za-z0-9]+)$/i);
    if (match) {
      return {
        lp: match[1].toUpperCase(),
        registration: match[2].toUpperCase(),
      };
    }
    return null;
  }

  /**
   * Pełna synchronizacja samochodów z archiwizacją
   */
  static async syncCars(userId?: number): Promise<CarSyncResult> {
    if (isCarSyncRunning) {
      throw new Error('Synchronizacja samochodów jest już uruchomiona');
    }
    isCarSyncRunning = true;
    const startedAt = new Date();
    const errors: Array<{ message: string }> = [];
    const stats: CarSyncResult['stats'] = {
      totalProcessed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      archived: 0,
    };

    const carRepository = AppDataSource.getRepository(Car);

    try {
      const symfoniaData = await this.fetchSymfoniaCarData();
      stats.totalProcessed = symfoniaData.length;

      const activeSymfoniaLps = new Set<string>();

      for (const record of symfoniaData) {
        if (!record.active) {
          stats.skipped++;
          continue;
        }

        const parsed = this.parseCarTitle(record.title);
        if (!parsed) {
          // Cicho ignoruj wpisy niespełniające formatu samochodu
          stats.skipped++;
          continue;
        }

        activeSymfoniaLps.add(parsed.lp);

        const car = await carRepository.findOne({ where: { symfoniaLp: parsed.lp } });

        if (!car) {
          const newCar = carRepository.create({
            symfoniaLp: parsed.lp,
            registration: parsed.registration,
            symfoniaElementId: record.elementId,
            active: true,
            brigadeId: null,
            archivedAt: null,
          });
          await carRepository.save(newCar);
          stats.created++;
          console.log(`🚗 [CARS] Dodano samochód: ${parsed.lp} (${parsed.registration})`);
        } else if (!car.active) {
          car.active = true;
          car.archivedAt = null;
          car.registration = parsed.registration;
          car.symfoniaElementId = record.elementId;
          await carRepository.save(car);
          stats.updated++;
          console.log(`🚗 [CARS] Reaktywowano samochód: ${parsed.lp}`);
        } else {
          // Aktualizuj pola jeśli zmieniły się w Symfonii
          const needsUpdate =
            car.registration !== parsed.registration ||
            car.symfoniaElementId !== record.elementId;

          if (needsUpdate) {
            car.registration = parsed.registration;
            car.symfoniaElementId = record.elementId;
            await carRepository.save(car);
            stats.updated++;
          } else {
            stats.skipped++;
          }
        }
      }

      // Archiwizuj samochody, które zniknęły z Symfonii
      const allActiveCars = await carRepository.find({ where: { active: true } });
      for (const car of allActiveCars) {
        if (!activeSymfoniaLps.has(car.symfoniaLp)) {
          car.active = false;
          car.archivedAt = new Date();
          await carRepository.save(car);
          stats.archived++;
          console.log(`🚗 [CARS] Zarchiwizowano samochód: ${car.symfoniaLp}`);
        }
      }

      const completedAt = new Date();
      const result: CarSyncResult = {
        success: stats.errors === 0,
        syncType: 'full',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        stats,
        errors,
      };
      await SymfoniaCarSyncService.logSync(result, userId, userId ? 'admin' : 'cron');
      return result;
    } catch (error) {
      const completedAt = new Date();
      const msg = error instanceof Error ? error.message : String(error);
      errors.push({ message: msg });
      console.error(`❌ [CARS] Błąd synchronizacji: ${msg}`);
      const result: CarSyncResult = {
        success: false,
        syncType: 'full',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        stats: { ...stats, errors: stats.errors + 1 },
        errors,
      };
      await SymfoniaCarSyncService.logSync(result, userId, userId ? 'admin' : 'cron').catch(() => {});
      return result;
    } finally {
      isCarSyncRunning = false;
    }
  }

  /**
   * Pobierz wszystkie aktywne samochody
   */
  static async getActiveCars(): Promise<Car[]> {
    const carRepository = AppDataSource.getRepository(Car);
    return carRepository.find({
      where: { active: true },
      order: { symfoniaLp: 'ASC' },
    });
  }

  /**
   * Loguje wynik synchronizacji do tabeli material_imports
   */
  static async logSync(
    result: CarSyncResult,
    userId: number | undefined,
    triggeredBy: 'admin' | 'cron'
  ): Promise<void> {
    try {
      const importRepo = AppDataSource.getRepository(MaterialImport);
      const timestamp = result.startedAt.toISOString().replace('T', ' ').substring(0, 19);
      const syncStatus = result.success
        ? 'completed'
        : result.stats.errors > 0 && result.stats.errors < result.stats.totalProcessed
          ? 'partial'
          : 'failed';

      const importLog = importRepo.create({
        filename: `symfonia_cars_full-${result.startedAt.toISOString()}`,
        status: syncStatus,
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
      console.error('❌ SymfoniaCarSyncService.logSync() ERROR:', err);
    }
  }

  /**
   * Zwraca status ostatniej synchronizacji samochodów
   */
  static async getStatus(): Promise<CarSyncStatus> {
    const importRepo = AppDataSource.getRepository(MaterialImport);

    const lastRecord = await importRepo
      .createQueryBuilder('i')
      .where("i.filename LIKE 'symfonia_cars_%'")
      .orderBy('i.createdAt', 'DESC')
      .getOne();

    const now = new Date();
    const nextSync = new Date(now);
    nextSync.setMinutes(0, 0, 0);
    // Align to next 00:00 or 12:00 boundary (matches cron: 0 */12 * * *)
    const nextHour = nextSync.getHours() < 12 ? 12 : 24;
    nextSync.setHours(nextHour);

    return {
      lastFullSync: lastRecord?.createdAt ?? null,
      lastQuickSync: null,
      nextScheduledSync: nextSync,
      isRunning: isCarSyncRunning,
      cronEnabled: process.env.SYMFONIA_SYNC_ENABLED !== 'false',
    };
  }

  /**
   * Zwraca historię synchronizacji samochodów
   */
  static async getHistory(limit: number = 10): Promise<CarSyncHistory[]> {
    const importRepo = AppDataSource.getRepository(MaterialImport);

    const records = await importRepo
      .createQueryBuilder('i')
      .where("i.filename LIKE 'symfonia_cars_%'")
      .orderBy('i.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return records.map((r) => {
      const meta = (r.diffPreview as any) || {};
      const importStatus = r.status === 'completed' ? 'success'
        : r.status === 'partial' ? 'partial'
        : 'failed';

      return {
        id: r.id,
        syncType: 'full' as const,
        triggeredBy: meta.triggeredBy || 'cron',
        userId: r.importedById,
        startedAt: r.createdAt,
        completedAt: r.confirmedAt ?? r.createdAt,
        status: importStatus as 'success' | 'partial' | 'failed',
        stats: meta.stats || {},
      };
    });
  }

  /**
   * Przełącz brygadę dla samochodu (tworzenie/odłączanie)
   * Używa BrigadeService.createBrigade() dla spójnej logiki tworzenia brygad.
   */
  static async toggleBrigade(carId: number, createBrigade: boolean): Promise<Car> {
    const carRepository = AppDataSource.getRepository(Car);
    const brigadeService = new BrigadeService();

    const car = await carRepository.findOne({ where: { id: carId } });
    if (!car) throw new Error('Samochód nie znaleziony');

    if (createBrigade && !car.brigadeId) {
      let brigade = await brigadeService.getBrigadeByCode(car.registration);

      if (!brigade) {
        brigade = await brigadeService.createBrigade({
          code: car.registration,
          name: car.registration,
          description: '',
          active: true,
        });
        console.log(`👷 [CARS] Utworzono brygadę: ${car.registration}`);
      }

      car.brigadeId = brigade.id;
      await carRepository.save(car);
    } else if (!createBrigade && car.brigadeId) {
      car.brigadeId = null;
      await carRepository.save(car);
    }

    return car;
  }
}

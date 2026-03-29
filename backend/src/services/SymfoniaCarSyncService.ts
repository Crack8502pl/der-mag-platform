// src/services/SymfoniaCarSyncService.ts
// WAŻNE: Ten serwis TYLKO POBIERA dane z MSSQL Symfonia - nigdy nie zapisuje!
// Data flows ONE WAY: Symfonia MSSQL [SSCommon].[STElements] (ElementKindId=128) → PostgreSQL cars

import * as sql from 'mssql';
import { AppDataSource } from '../config/database';
import { Car } from '../entities/Car';
import { Brigade } from '../entities/Brigade';

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
  static async syncCars(): Promise<CarSyncResult> {
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
          errors.push({ message: `Nie można sparsować tytułu: "${record.title}"` });
          stats.errors++;
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
          await carRepository.save(car);
          stats.updated++;
          console.log(`🚗 [CARS] Reaktywowano samochód: ${parsed.lp}`);
        } else {
          stats.skipped++;
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
      return {
        success: stats.errors === 0,
        syncType: 'full',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        stats,
        errors,
      };
    } catch (error) {
      const completedAt = new Date();
      const msg = error instanceof Error ? error.message : String(error);
      errors.push({ message: msg });
      console.error(`❌ [CARS] Błąd synchronizacji: ${msg}`);
      return {
        success: false,
        syncType: 'full',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        stats: { ...stats, errors: stats.errors + 1 },
        errors,
      };
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
   * Przełącz brygadę dla samochodu (tworzenie/odłączanie)
   */
  static async toggleBrigade(carId: number, createBrigade: boolean): Promise<Car> {
    const carRepository = AppDataSource.getRepository(Car);
    const brigadeRepository = AppDataSource.getRepository(Brigade);

    const car = await carRepository.findOne({ where: { id: carId } });
    if (!car) throw new Error('Samochód nie znaleziony');

    if (createBrigade && !car.brigadeId) {
      // Sprawdź czy brygada o tym kodzie już istnieje
      let brigade = await brigadeRepository.findOne({ where: { code: car.registration } });

      if (!brigade) {
        brigade = brigadeRepository.create({
          code: car.registration,
          name: car.registration,
          description: '',
          active: true,
        });
        await brigadeRepository.save(brigade);
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

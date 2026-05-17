// backend/src/services/RailwayService.ts

import { ILike, Like } from 'typeorm';
import { AppDataSource } from '../config/database';
import { RailwayLine } from '../entities/RailwayLine.entity';
import { RailwayStation } from '../entities/RailwayStation.entity';

export class RailwayService {
  private get lineRepo() {
    return AppDataSource.getRepository(RailwayLine);
  }

  private get stationRepo() {
    return AppDataSource.getRepository(RailwayStation);
  }

  /** Pobierz wszystkie aktywne linie (opcjonalne filtrowanie po fragmencie kodu/nazwy) */
  async searchLines(query?: string): Promise<RailwayLine[]> {
    if (!query || query.trim() === '') {
      return this.lineRepo.find({
        where: { active: true },
        order: { code: 'ASC' },
      });
    }

    const q = query.trim();
    return this.lineRepo.find({
      where: [
        { active: true, code: ILike(`%${q}%`) },
        { active: true, name: ILike(`%${q}%`) },
      ],
      order: { code: 'ASC' },
      take: 50,
    });
  }

  /** Pobierz linię po kodzie (np. "LK-221") */
  async getLineByCode(code: string): Promise<RailwayLine | null> {
    return this.lineRepo.findOne({
      where: { code: code.toUpperCase(), active: true },
    });
  }

  /**
   * Wyszukaj stacje (po nazwie lub gminie, opcjonalnie filtruj po linii).
   * Używa ILIKE do wyszukiwania case-insensitive.
   */
  async searchStations(query: string, lineCode?: string, limit = 10): Promise<RailwayStation[]> {
    const q = query.trim();
    if (!q) {
      return [];
    }

    const qb = this.stationRepo
      .createQueryBuilder('s')
      .where('s.active = :active', { active: true })
      .andWhere(
        '(s.name ILIKE :q OR s.municipality ILIKE :q OR s.code ILIKE :q)',
        { q: `%${q}%` }
      )
      .orderBy('s.name', 'ASC')
      .take(limit);

    if (lineCode) {
      qb.andWhere('s.line_code = :lineCode', { lineCode: lineCode.toUpperCase() });
    }

    return qb.getMany();
  }

  /**
   * Waliduj czy km mieści się w zakresie linii.
   * Zwraca { valid, min, max }.
   */
  async validateKilometraz(
    km: number,
    lineCode: string
  ): Promise<{ valid: boolean; min: number; max: number }> {
    const line = await this.getLineByCode(lineCode);
    if (!line || line.kmFrom === null || line.kmTo === null) {
      return { valid: true, min: 0, max: 9999 };
    }
    const min = Number(line.kmFrom);
    const max = Number(line.kmTo);
    return { valid: km >= min && km <= max, min, max };
  }

  /** Pobierz stacje dla danej linii posortowane po km */
  async getStationsForLine(lineCode: string): Promise<RailwayStation[]> {
    return this.stationRepo.find({
      where: { lineCode: lineCode.toUpperCase(), active: true },
      order: { kmPosition: 'ASC' },
    });
  }
}

export const railwayService = new RailwayService();

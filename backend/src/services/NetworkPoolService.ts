// src/services/NetworkPoolService.ts
// Serwis zarządzania pulami IP

import { AppDataSource } from '../config/database';
import { NetworkPool } from '../entities/NetworkPool';
import { Repository } from 'typeorm';

export class NetworkPoolService {
  private poolRepository: Repository<NetworkPool>;

  constructor() {
    this.poolRepository = AppDataSource.getRepository(NetworkPool);
  }

  /**
   * Utworzenie nowej puli IP
   */
  async createPool(data: {
    name: string;
    cidrRange: string;
    priority: number;
    description?: string;
  }): Promise<NetworkPool> {
    // Walidacja CIDR
    if (!this.validateCIDR(data.cidrRange)) {
      throw new Error('Nieprawidłowy format CIDR');
    }

    // Sprawdź czy pula o tej nazwie już istnieje
    const existing = await this.poolRepository.findOne({
      where: { name: data.name }
    });

    if (existing) {
      throw new Error(`Pula o nazwie ${data.name} już istnieje`);
    }

    const pool = this.poolRepository.create({
      name: data.name,
      cidrRange: data.cidrRange,
      priority: data.priority,
      description: data.description,
      isActive: true
    });

    return await this.poolRepository.save(pool);
  }

  /**
   * Podstawowa walidacja formatu CIDR
   */
  private validateCIDR(cidr: string): boolean {
    const regex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    return regex.test(cidr);
  }

  /**
   * Pobranie puli po ID
   */
  async getPoolById(id: number): Promise<NetworkPool | null> {
    return await this.poolRepository.findOne({
      where: { id },
      relations: ['allocations']
    });
  }

  /**
   * Lista wszystkich pul
   */
  async getAllPools(activeOnly: boolean = false): Promise<NetworkPool[]> {
    const query = this.poolRepository
      .createQueryBuilder('pool')
      .orderBy('pool.priority', 'ASC');

    if (activeOnly) {
      query.where('pool.isActive = true');
    }

    return await query.getMany();
  }

  /**
   * Aktualizacja puli
   */
  async updatePool(id: number, data: Partial<NetworkPool>): Promise<NetworkPool> {
    const pool = await this.getPoolById(id);
    if (!pool) {
      throw new Error('Pula nie znaleziona');
    }

    if (data.cidrRange && !this.validateCIDR(data.cidrRange)) {
      throw new Error('Nieprawidłowy format CIDR');
    }

    Object.assign(pool, data);
    return await this.poolRepository.save(pool);
  }

  /**
   * Usunięcie puli
   */
  async deletePool(id: number): Promise<void> {
    const pool = await this.getPoolById(id);
    if (!pool) {
      throw new Error('Pula nie znaleziona');
    }

    // Sprawdź czy pula ma alokacje
    if (pool.allocations && pool.allocations.length > 0) {
      throw new Error('Nie można usunąć puli posiadającej alokacje');
    }

    await this.poolRepository.remove(pool);
  }

  /**
   * Dezaktywacja puli
   */
  async deactivatePool(id: number): Promise<NetworkPool> {
    const pool = await this.getPoolById(id);
    if (!pool) {
      throw new Error('Pula nie znaleziona');
    }

    pool.isActive = false;
    return await this.poolRepository.save(pool);
  }
}

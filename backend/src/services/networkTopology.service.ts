// src/services/networkTopology.service.ts
// Service for Network Topology CRUD with immutable-rows versioning

import { IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { NetworkTopology } from '../entities/NetworkTopology.entity';
import { CreateNetworkTopologyDto, UpdateNetworkTopologyDto } from '../dto/network-topology.dto';

export class NetworkTopologyService {
  /**
   * Pobierz najnowszą wersję topologii dla kontraktu/podsystemu (bez soft-deleted)
   */
  async getLatest(contractId: number, subsystemIndex: number): Promise<NetworkTopology | null> {
    return await AppDataSource.getRepository(NetworkTopology).findOne({
      where: { contractId, subsystemIndex, deletedAt: IsNull() },
      order: { version: 'DESC' },
    });
  }

  /**
   * Pobierz konkretny rekord po ID (bez soft-deleted)
   */
  async getById(id: string): Promise<NetworkTopology | null> {
    return await AppDataSource.getRepository(NetworkTopology).findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  /**
   * Pobierz wszystkie topologie dla kontraktu (tylko najnowsze wersje każdego podsystemu)
   */
  async getAllByContract(contractId: number): Promise<NetworkTopology[]> {
    // Używamy subquery: dla każdego subsystemIndex pobieramy max version
    const repo = AppDataSource.getRepository(NetworkTopology);
    const subQuery = repo
      .createQueryBuilder('nt_sub')
      .select('MAX(nt_sub.version)', 'max_version')
      .addSelect('nt_sub.subsystemIndex', 'subsystem_index')
      .where('nt_sub.contractId = :contractId', { contractId })
      .andWhere('nt_sub.deletedAt IS NULL')
      .groupBy('nt_sub.subsystemIndex');

    return await repo
      .createQueryBuilder('nt')
      .where('nt.contractId = :contractId', { contractId })
      .andWhere('nt.deletedAt IS NULL')
      .andWhere(
        `(nt.subsystemIndex, nt.version) IN (${subQuery.getQuery()})`,
        subQuery.getParameters(),
      )
      .orderBy('nt.subsystemIndex', 'ASC')
      .getMany();
  }

  /**
   * Utwórz nową topologię (immutable rows: zawsze nowy rekord, version=max+1 lub 1)
   */
  async create(dto: CreateNetworkTopologyDto): Promise<NetworkTopology> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repo = queryRunner.manager.getRepository(NetworkTopology);

      // Wyznacz numer wersji (biorąc pod uwagę wszystkie wersje, w tym soft-deleted)
      const lastVersion = await repo
        .createQueryBuilder('nt')
        .where('nt.contractId = :contractId AND nt.subsystemIndex = :subsystemIndex', {
          contractId: dto.contractId,
          subsystemIndex: dto.subsystemIndex,
        })
        .orderBy('nt.version', 'DESC')
        .getOne();

      const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

      // Przypisz id do nodes i connections jeśli brak
      const nodes = dto.nodes.map(n => ({
        ...n,
        id: n.id || crypto.randomUUID(),
      }));
      const connections = dto.connections.map(c => ({
        ...c,
        id: c.id || crypto.randomUUID(),
      }));

      const topology = repo.create({
        name: dto.name,
        version: nextVersion,
        contractId: dto.contractId,
        subsystemIndex: dto.subsystemIndex,
        subsystemType: dto.subsystemType,
        nodes,
        connections,
        notes: dto.notes ?? null,
      });

      const saved = await repo.save(topology);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * "Update" = tworzenie nowej wersji immutable dla istniejącego contractId/subsystemIndex
   */
  async createNewVersion(
    contractId: number,
    subsystemIndex: number,
    dto: UpdateNetworkTopologyDto,
  ): Promise<NetworkTopology> {
    return await this.create({ ...dto, contractId, subsystemIndex });
  }

  /**
   * Historia wersji z paginacją (wszystkie wersje, włącznie z soft-deleted)
   */
  async getHistory(
    contractId: number,
    subsystemIndex: number,
    page = 1,
    limit = 20,
  ): Promise<{ data: NetworkTopology[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await AppDataSource.getRepository(NetworkTopology).findAndCount({
      where: { contractId, subsystemIndex },
      order: { version: 'DESC' },
      take: limit,
      skip,
    });
    return { data, total, page, limit };
  }

  /**
   * Soft-delete najnowszej aktywnej wersji
   */
  async delete(contractId: number, subsystemIndex: number): Promise<void> {
    const latest = await this.getLatest(contractId, subsystemIndex);
    if (!latest) {
      throw new Error('TOPOLOGY_NOT_FOUND');
    }
    latest.deletedAt = new Date();
    await AppDataSource.getRepository(NetworkTopology).save(latest);
  }
}

export default new NetworkTopologyService();

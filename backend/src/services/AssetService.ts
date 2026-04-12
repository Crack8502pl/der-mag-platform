// src/services/AssetService.ts
// Business logic service for asset operations

import { AppDataSource } from '../config/database';
import { Asset } from '../entities/Asset';
import { Repository } from 'typeorm';

export class AssetService {
  private assetRepository: Repository<Asset>;

  constructor() {
    this.assetRepository = AppDataSource.getRepository(Asset);
  }

  /**
   * Get all assets with optional filters
   */
  async getAllAssets(filters?: {
    assetType?: string;
    status?: string;
    contractId?: number;
    subsystemId?: number;
    category?: string;
    search?: string;
  }, options?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ assets: Asset[]; total: number; page: number; limit: number; totalPages: number }> {
    const query = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.contract', 'contract')
      .leftJoinAndSelect('asset.subsystem', 'subsystem')
      .leftJoinAndSelect('asset.installationTask', 'installationTask')
      .leftJoinAndSelect('asset.createdByUser', 'createdByUser')
      .leftJoinAndSelect('asset.installedDevices', 'installedDevices');

    // Apply filters
    if (filters?.assetType) {
      query.andWhere('asset.assetType = :assetType', { assetType: filters.assetType });
    }

    if (filters?.status) {
      query.andWhere('asset.status = :status', { status: filters.status });
    }

    if (filters?.contractId) {
      query.andWhere('asset.contractId = :contractId', { contractId: filters.contractId });
    }

    if (filters?.subsystemId) {
      query.andWhere('asset.subsystemId = :subsystemId', { subsystemId: filters.subsystemId });
    }

    if (filters?.category) {
      query.andWhere('asset.category = :category', { category: filters.category });
    }

    // Full-text search on asset number, name, location fields
    if (filters?.search) {
      query.andWhere(
        '(asset.assetNumber ILIKE :search OR asset.name ILIKE :search OR asset.liniaKolejowa ILIKE :search OR asset.miejscowosc ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Count total before pagination
    const total = await query.getCount();

    // Apply sorting
    const sortBy = options?.sortBy || 'createdAt';
    const sortOrder = options?.sortOrder || 'DESC';
    query.orderBy(`asset.${sortBy}`, sortOrder);

    // Apply pagination
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    query.skip((page - 1) * limit).take(limit);

    const assets = await query.getMany();

    return {
      assets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get single asset by ID
   */
  async getAssetById(id: number): Promise<Asset | null> {
    return await this.assetRepository.findOne({
      where: { id },
      relations: [
        'contract',
        'contract.projectManager',
        'subsystem',
        'installationTask',
        'createdByUser',
        'installedDevices',
        'assetTasks',
        'assetTasks.task',
        'statusHistory',
        'statusHistory.changedByUser'
      ]
    });
  }

  /**
   * Get asset by asset number (unique)
   */
  async getAssetByNumber(assetNumber: string): Promise<Asset | null> {
    return await this.assetRepository.findOne({
      where: { assetNumber },
      relations: [
        'contract',
        'contract.projectManager',
        'subsystem',
        'installationTask',
        'createdByUser',
        'installedDevices',
        'assetTasks',
        'statusHistory'
      ]
    });
  }

  /**
   * Get assets for a specific contract
   */
  async getAssetsByContract(contractId: number): Promise<Asset[]> {
    return await this.assetRepository.find({
      where: { contractId },
      relations: ['subsystem', 'installationTask', 'installedDevices'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get assets for a specific subsystem
   */
  async getAssetsBySubsystem(subsystemId: number): Promise<Asset[]> {
    return await this.assetRepository.find({
      where: { subsystemId },
      relations: ['contract', 'installationTask', 'installedDevices'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get asset statistics
   */
  async getAssetStats(): Promise<{
    totalAssets: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    const totalAssets = await this.assetRepository.count();

    // Count by status
    const byStatusRaw = await this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('asset.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    byStatusRaw.forEach(row => {
      byStatus[row.status] = parseInt(row.count);
    });

    // Count by type
    const byTypeRaw = await this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.assetType', 'assetType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('asset.assetType')
      .getRawMany();

    const byType: Record<string, number> = {};
    byTypeRaw.forEach(row => {
      byType[row.assetType] = parseInt(row.count);
    });

    // Count by category
    const byCategoryRaw = await this.assetRepository
      .createQueryBuilder('asset')
      .select('asset.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('asset.category IS NOT NULL')
      .groupBy('asset.category')
      .getRawMany();

    const byCategory: Record<string, number> = {};
    byCategoryRaw.forEach(row => {
      byCategory[row.category] = parseInt(row.count);
    });

    return {
      totalAssets,
      byStatus,
      byType,
      byCategory
    };
  }
}

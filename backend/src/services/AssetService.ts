// src/services/AssetService.ts
// Business logic service for asset operations

import { AppDataSource } from '../config/database';
import { Asset, AssetTaskRole } from '../entities/Asset';
import { AssetTask } from '../entities/AssetTask';
import { SubsystemTask, TaskWorkflowStatus } from '../entities/SubsystemTask';
import { Repository } from 'typeorm';
import { AssetNumberingService } from './AssetNumberingService';

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

    // Apply sorting — whitelist column names to prevent SQL injection
    const allowedSortFields: Record<string, string> = {
      createdAt: 'asset.createdAt',
      updatedAt: 'asset.updatedAt',
      assetNumber: 'asset.assetNumber',
      name: 'asset.name',
      assetType: 'asset.assetType',
      status: 'asset.status',
      category: 'asset.category',
      liniaKolejowa: 'asset.liniaKolejowa',
      miejscowosc: 'asset.miejscowosc'
    };
    const sortByKey = options?.sortBy;
    const sortColumn = sortByKey && allowedSortFields[sortByKey]
      ? allowedSortFields[sortByKey]
      : allowedSortFields.createdAt;
    const sortOrder = options?.sortOrder === 'ASC' || options?.sortOrder === 'DESC'
      ? options.sortOrder
      : 'DESC';
    query.orderBy(sortColumn, sortOrder);

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

  /**
   * Create new asset
   */
  async createAsset(data: {
    assetType: string;
    name: string;
    category?: string | null;
    liniaKolejowa?: string | null;
    kilometraz?: string | null;
    gpsLatitude?: number | null;
    gpsLongitude?: number | null;
    googleMapsUrl?: string | null;
    miejscowosc?: string | null;
    contractId?: number | null;
    subsystemId?: number | null;
    installationTaskId?: number | null;
    status?: string;
    plannedInstallationDate?: Date | null;
    actualInstallationDate?: Date | null;
    warrantyExpiryDate?: Date | null;
    bomSnapshot?: Record<string, any> | null;
    notes?: string | null;
    photosFolder?: string | null;
    createdBy?: number;
  }): Promise<Asset> {
    // Validation
    if (!data.assetType || !data.name) {
      throw new Error('Typ obiektu i nazwa są wymagane');
    }

    // Validate assetType
    const validTypes = ['PRZEJAZD', 'SKP', 'NASTAWNIA', 'LCS', 'CUID'];
    if (!validTypes.includes(data.assetType)) {
      throw new Error(`Nieprawidłowy typ obiektu. Dozwolone: ${validTypes.join(', ')}`);
    }

    // Validate category if assetType is PRZEJAZD; auto-null for other types
    if (data.assetType === 'PRZEJAZD' && data.category) {
      const validCategories = ['KAT A', 'KAT B', 'KAT C', 'KAT E', 'KAT F'];
      if (!validCategories.includes(data.category)) {
        throw new Error(`Nieprawidłowa kategoria przejazdu. Dozwolone: ${validCategories.join(', ')}`);
      }
    }
    const normalizedCategory = data.assetType === 'PRZEJAZD' ? (data.category || null) : null;

    // Validate status
    const validStatuses = ['planned', 'installed', 'active', 'in_service', 'faulty', 'inactive', 'decommissioned'];
    const status = data.status || 'planned';
    if (!validStatuses.includes(status)) {
      throw new Error(`Nieprawidłowy status. Dozwolone: ${validStatuses.join(', ')}`);
    }

    // Generate unique asset number using AssetNumberingService
    const numberingService = new AssetNumberingService(AppDataSource);
    const assetNumber = await numberingService.generateAssetNumber();

    // Create asset
    const asset = this.assetRepository.create({
      assetNumber,
      assetType: data.assetType as any,
      name: data.name,
      category: normalizedCategory as any,
      liniaKolejowa: data.liniaKolejowa || null,
      kilometraz: data.kilometraz || null,
      gpsLatitude: data.gpsLatitude ?? null,
      gpsLongitude: data.gpsLongitude ?? null,
      googleMapsUrl: data.googleMapsUrl || null,
      miejscowosc: data.miejscowosc || null,
      contractId: data.contractId ?? null,
      subsystemId: data.subsystemId ?? null,
      installationTaskId: data.installationTaskId ?? null,
      status: status as any,
      plannedInstallationDate: data.plannedInstallationDate ?? null,
      actualInstallationDate: data.actualInstallationDate ?? null,
      warrantyExpiryDate: data.warrantyExpiryDate ?? null,
      bomSnapshot: data.bomSnapshot ?? null,
      notes: data.notes || null,
      photosFolder: data.photosFolder || null,
      createdBy: data.createdBy ?? null
    });

    return await this.assetRepository.save(asset);
  }

  /**
   * Update existing asset
   */
  async updateAsset(id: number, data: Partial<Asset>): Promise<Asset> {
    const asset = await this.assetRepository.findOneBy({ id });

    if (!asset) {
      throw new Error('Obiekt nie znaleziony');
    }

    // Don't allow changing asset number
    if (data.assetNumber && data.assetNumber !== asset.assetNumber) {
      throw new Error('Nie można zmienić numeru obiektu');
    }

    // Status must be changed through updateStatus()
    if (data.status !== undefined) {
      throw new Error('Użyj PATCH /status do zmiany statusu obiektu');
    }

    // Determine effective assetType after update
    const effectiveType = data.assetType ?? asset.assetType;

    // Validate assetType if being changed
    if (data.assetType) {
      const validTypes = ['PRZEJAZD', 'SKP', 'NASTAWNIA', 'LCS', 'CUID'];
      if (!validTypes.includes(data.assetType)) {
        throw new Error(`Nieprawidłowy typ obiektu. Dozwolone: ${validTypes.join(', ')}`);
      }
    }

    // Validate and normalize category based on effective type
    if (data.category !== undefined || data.assetType !== undefined) {
      if (effectiveType !== 'PRZEJAZD') {
        // Auto-null category for non-PRZEJAZD types
        data = { ...data, category: null as any };
      } else if (data.category !== undefined && data.category !== null) {
        const validCategories = ['KAT A', 'KAT B', 'KAT C', 'KAT E', 'KAT F'];
        if (!validCategories.includes(data.category)) {
          throw new Error(`Nieprawidłowa kategoria. Dozwolone: ${validCategories.join(', ')}`);
        }
      }
    }

    // Apply only whitelisted updatable fields
    const allowedFields: (keyof Asset)[] = [
      'assetType', 'name', 'category',
      'liniaKolejowa', 'kilometraz', 'gpsLatitude', 'gpsLongitude', 'googleMapsUrl', 'miejscowosc',
      'contractId', 'subsystemId', 'installationTaskId',
      'plannedInstallationDate', 'actualInstallationDate', 'warrantyExpiryDate',
      'lastServiceDate', 'nextServiceDueDate',
      'bomSnapshot', 'notes', 'photosFolder'
    ];

    for (const field of allowedFields) {
      if (field in data) {
        (asset as any)[field] = (data as any)[field];
      }
    }

    return await this.assetRepository.save(asset);
  }

  /**
   * Update asset status (with automatic history logging via trigger)
   */
  async updateStatus(id: number, newStatus: string, userId?: number): Promise<Asset> {
    const asset = await this.assetRepository.findOneBy({ id });

    if (!asset) {
      throw new Error('Obiekt nie znaleziony');
    }

    // Validate status
    const validStatuses = ['planned', 'installed', 'active', 'in_service', 'faulty', 'inactive', 'decommissioned'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Nieprawidłowy status. Dozwolone: ${validStatuses.join(', ')}`);
    }

    // Validate status transitions (business logic)
    const oldStatus = asset.status;

    // Can't go from decommissioned back to any other status
    if (oldStatus === 'decommissioned' && newStatus !== 'decommissioned') {
      throw new Error('Nie można przywrócić obiektu po wycofaniu z użytku');
    }

    // Update status
    asset.status = newStatus as any;

    return await this.assetRepository.save(asset);
  }

  /**
   * Delete asset (soft delete - set status to decommissioned)
   */
  async deleteAsset(id: number): Promise<void> {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ['installedDevices']
    });

    if (!asset) {
      throw new Error('Obiekt nie znaleziony');
    }

    // Check if asset has installed devices
    if (asset.installedDevices && asset.installedDevices.length > 0) {
      throw new Error('Nie można usunąć obiektu z zainstalowanymi urządzeniami. Najpierw usuń urządzenia.');
    }

    // Soft delete by setting status to decommissioned
    asset.status = 'decommissioned';
    asset.decommissionDate = new Date();

    await this.assetRepository.save(asset);
  }

  /**
   * Create service task for asset
   */
  async createServiceTask(
    assetId: number,
    taskData: {
      taskRole: AssetTaskRole;
      taskName: string;
      scheduledDate?: Date;
      priority?: number;
      assignedTo?: number;
      description?: string;
    },
    createdBy: number
  ): Promise<{
    task: SubsystemTask;
    asset: Asset;
  }> {
    // 1. Validate asset exists
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
      relations: ['contract', 'subsystem']
    });

    if (!asset) {
      throw new Error('Obiekt nie znaleziony');
    }

    if (!asset.subsystem) {
      throw new Error('Obiekt nie ma przypisanego podsystemu');
    }

    if (!asset.contract) {
      throw new Error('Obiekt nie ma przypisanego kontraktu');
    }

    // 2. Validate task role
    const validRoles: AssetTaskRole[] = ['warranty_service', 'repair', 'maintenance', 'decommission'];
    if (!validRoles.includes(taskData.taskRole)) {
      throw new Error(`Nieprawidłowa rola zadania. Dozwolone: ${validRoles.join(', ')}`);
    }

    // 3. Create task in transaction
    const result = await AppDataSource.transaction(async manager => {
      const taskRepo = manager.getRepository(SubsystemTask);
      const assetTaskRepo = manager.getRepository(AssetTask);
      const assetRepo = manager.getRepository(Asset);

      // Generate task number
      const lastTask = await taskRepo.findOne({
        order: { id: 'DESC' }
      });
      const nextNumber = lastTask ? lastTask.id + 1 : 1;
      const taskNumber = `P${String(nextNumber).padStart(6, '0')}`;

      // Determine task type from role
      const taskTypeMap: Record<AssetTaskRole, string> = {
        'warranty_service': 'WARRANTY_SERVICE',
        'repair': 'REPAIR',
        'maintenance': 'MAINTENANCE',
        'decommission': 'DECOMMISSION',
        'installation': 'INSTALLATION'
      };
      const taskType = taskTypeMap[taskData.taskRole] || 'MAINTENANCE';

      // Create task
      const task = taskRepo.create({
        taskNumber,
        taskName: taskData.taskName,
        taskType,
        status: TaskWorkflowStatus.CREATED,
        subsystemId: asset.subsystemId!,
        linkedAssetId: assetId,
        taskRole: taskData.taskRole,
        metadata: {
          description: taskData.description || `Zadanie serwisowe dla ${asset.name}`,
          scheduledDate: taskData.scheduledDate || null,
          priority: taskData.priority || 0,
          assignedToId: taskData.assignedTo || null,
          createdById: createdBy,
          contractId: asset.contractId
        }
      });

      const savedTask = await taskRepo.save(task);

      // Create asset_tasks entry
      const assetTask = assetTaskRepo.create({
        assetId: assetId,
        taskId: savedTask.id,
        taskRole: taskData.taskRole
      });

      await assetTaskRepo.save(assetTask);

      // If task role is warranty_service or repair, update asset status to in_service
      if (taskData.taskRole === 'warranty_service' || taskData.taskRole === 'repair') {
        asset.status = 'in_service';
        await assetRepo.save(asset);
      }

      return {
        task: savedTask,
        asset
      };
    });

    return result;
  }
}

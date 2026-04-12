// src/services/AssetCreationService.ts
// Orchestration service for creating an asset from a completed SubsystemTask

import { AppDataSource } from '../config/database';
import { Asset, AssetType, AssetCategory, AssetStatus } from '../entities/Asset';
import { SubsystemTask, TaskWorkflowStatus } from '../entities/SubsystemTask';
import { Device } from '../entities/Device';
import { SystemType } from '../entities/Subsystem';
import { AssetNumberingService } from './AssetNumberingService';
import { DeviceLinkingService } from './DeviceLinkingService';
import { TaskSyncService } from './TaskSyncService';
import { Repository } from 'typeorm';

export interface AssetCreationResult {
  asset: Asset;
  linkedDevices: Device[];
  task: SubsystemTask;
  warnings?: string[];
}

// Polish error messages that represent known business-rule violations (return HTTP 400)
export const ASSET_CREATION_BUSINESS_ERRORS = new Set([
  'Zadanie nie znalezione',
  'Zadanie jest już zakończone',
  'Zadanie nie ma przypisanego podsystemu',
  'Podsystem nie ma przypisanego kontraktu',
  'Typ obiektu i nazwa są wymagane',
  'Nieprawidłowy typ obiektu. Dozwolone: PRZEJAZD, SKP, NASTAWNIA, LCS, CUID',
]);

export class AssetCreationService {
  private deviceLinkingService: DeviceLinkingService;
  private subsystemTaskRepository: Repository<SubsystemTask>;

  constructor() {
    this.deviceLinkingService = new DeviceLinkingService();
    this.subsystemTaskRepository = AppDataSource.getRepository(SubsystemTask);
  }

  /**
   * Complete task and create asset in one atomic operation.
   *
   * Validation of the task is done before the transaction so that business-rule
   * violations (404/400) are cheap and don't hold a DB connection.  The asset
   * creation, device linking and task save all run inside a single
   * AppDataSource.transaction() so that any failure rolls back every change.
   * After the commit, TaskSyncService.syncFromSubsystemTask() is called
   * "best-effort" to keep the legacy `tasks` table in sync.
   */
  async createAssetFromTask(
    taskId: number,
    assetData: {
      name: string;
      category?: string | null;
      liniaKolejowa?: string | null;
      kilometraz?: string | null;
      gpsLatitude?: number | null;
      gpsLongitude?: number | null;
      googleMapsUrl?: string | null;
      miejscowosc?: string | null;
      status?: string;
      actualInstallationDate?: Date | null;
      warrantyExpiryDate?: Date | null;
      notes?: string | null;
      photosFolder?: string | null;
    },
    deviceSerialNumbers?: string[]
  ): Promise<AssetCreationResult> {
    // ── 1. Validate task (outside transaction – cheap, throws 404/400 early) ──
    const task = await this.subsystemTaskRepository.findOne({
      where: { id: taskId },
      relations: ['subsystem', 'subsystem.contract']
    });

    if (!task) {
      throw new Error('Zadanie nie znalezione');
    }

    if (task.status === TaskWorkflowStatus.VERIFIED) {
      throw new Error('Zadanie jest już zakończone');
    }

    if (!task.subsystem) {
      throw new Error('Zadanie nie ma przypisanego podsystemu');
    }

    if (!task.subsystem.contract) {
      throw new Error('Podsystem nie ma przypisanego kontraktu');
    }

    // ── 2. Derive asset type and validate asset fields before the transaction ─
    const assetType = this.deriveAssetTypeFromTask(task);

    const validTypes: string[] = ['PRZEJAZD', 'SKP', 'NASTAWNIA', 'LCS', 'CUID'];
    if (!validTypes.includes(assetType)) {
      throw new Error('Nieprawidłowy typ obiektu. Dozwolone: PRZEJAZD, SKP, NASTAWNIA, LCS, CUID');
    }

    const validStatuses = ['planned', 'installed', 'active', 'in_service', 'faulty', 'inactive', 'decommissioned'];
    const resolvedStatus = assetData.status || 'installed';
    if (!validStatuses.includes(resolvedStatus)) {
      throw new Error(`Nieprawidłowy status. Dozwolone: ${validStatuses.join(', ')}`);
    }

    const normalizedCategory = this.normalizeCategory(assetType, assetData.category);

    // ── 3. Extract BOM from task metadata ────────────────────────────────────
    const bomSnapshot = task.metadata?.bom || task.metadata?.configParams?.bom || null;

    // ── 4. Generate asset number (advisory-locked sub-transaction) ────────────
    // Note: asset number generation uses its own sub-transaction with an advisory
    // lock. If the main transaction below fails, the generated number is consumed
    // (a gap appears in the sequence). This is by design — gaps are acceptable
    // and retrying is safe.
    const numberingService = new AssetNumberingService(AppDataSource);
    const assetNumber = await numberingService.generateAssetNumber();

    // ── 5. Atomic: create asset + link devices + save task ────────────────────
    let linkedDevices: Device[] = [];
    const warnings: string[] = [];

    const { savedAsset, savedTask } = await AppDataSource.transaction(async manager => {
      const assetRepo = manager.getRepository(Asset);
      const taskRepo = manager.getRepository(SubsystemTask);

      // Create asset
      const assetEntity = assetRepo.create({
        assetNumber,
        assetType: assetType as AssetType,
        name: assetData.name,
        category: normalizedCategory as AssetCategory | null,
        liniaKolejowa: assetData.liniaKolejowa || null,
        kilometraz: assetData.kilometraz || null,
        gpsLatitude: assetData.gpsLatitude ?? null,
        gpsLongitude: assetData.gpsLongitude ?? null,
        googleMapsUrl: assetData.googleMapsUrl || null,
        miejscowosc: assetData.miejscowosc || null,
        contractId: task.subsystem!.contractId,
        subsystemId: task.subsystemId,
        installationTaskId: taskId,
        status: resolvedStatus as AssetStatus,
        actualInstallationDate: assetData.actualInstallationDate || new Date(),
        warrantyExpiryDate: assetData.warrantyExpiryDate ?? null,
        bomSnapshot,
        notes: assetData.notes || null,
        photosFolder: assetData.photosFolder || null
      });
      const savedAsset = await assetRepo.save(assetEntity);

      // Link devices (same transaction manager)
      if (deviceSerialNumbers && deviceSerialNumbers.length > 0) {
        const linkResult = await this.deviceLinkingService.linkDevicesWithManager(
          manager,
          savedAsset.id,
          deviceSerialNumbers,
          bomSnapshot
        );

        linkedDevices = linkResult.linked;

        if (linkResult.notFound.length > 0) {
          warnings.push(`Nie znaleziono urządzeń: ${linkResult.notFound.join(', ')}`);
        }
        if (linkResult.alreadyInstalled.length > 0) {
          warnings.push(`Urządzenia już zainstalowane: ${linkResult.alreadyInstalled.join(', ')}`);
        }
      }

      // Update task (same transaction manager)
      task.status = TaskWorkflowStatus.VERIFIED;
      task.realizationCompletedAt = new Date();
      task.linkedAssetId = savedAsset.id;
      task.taskRole = 'installation';
      task.metadata = {
        ...task.metadata,
        assetId: savedAsset.id,
        assetNumber: savedAsset.assetNumber,
        completedAt: new Date().toISOString()
      };
      const savedTask = await taskRepo.save(task);

      return { savedAsset, savedTask };
    });

    // ── 6. Best-effort sync to legacy `tasks` table (outside transaction) ────
    await TaskSyncService.syncFromSubsystemTask(savedTask.taskNumber, savedTask.status);

    return {
      asset: savedAsset,
      linkedDevices,
      task: savedTask,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate and normalise category: only PRZEJAZD assets have a category column.
   */
  private normalizeCategory(assetType: string, category?: string | null): string | null {
    if (assetType !== 'PRZEJAZD') {
      return null;
    }
    if (!category) {
      return null;
    }
    const validCategories = ['KAT A', 'KAT B', 'KAT C', 'KAT E', 'KAT F'];
    if (!validCategories.includes(category)) {
      throw new Error(`Nieprawidłowa kategoria przejazdu. Dozwolone: ${validCategories.join(', ')}`);
    }
    return category;
  }

  /**
   * Derive asset type using a priority chain:
   *   1. task.metadata.configParams.assetType  (explicit override)
   *   2. task.taskType keywords (PRZEJAZD / SKP / NASTAWNIA / LCS / CUID)
   *   3. Mapping from subsystem.systemType (SystemType enum)
   *   4. 'PRZEJAZD' fallback
   */
  private deriveAssetTypeFromTask(task: SubsystemTask): string {
    // 1. Explicit override in metadata
    if (task.metadata?.configParams?.assetType) {
      return task.metadata.configParams.assetType;
    }

    // 2. Keywords in task type string
    if (task.taskType) {
      const taskTypeUpper = task.taskType.toUpperCase();
      if (taskTypeUpper.includes('PRZEJAZD')) return 'PRZEJAZD';
      if (taskTypeUpper.includes('SKP')) return 'SKP';
      if (taskTypeUpper.includes('NASTAWNIA')) return 'NASTAWNIA';
      if (taskTypeUpper.includes('LCS')) return 'LCS';
      if (taskTypeUpper.includes('CUID')) return 'CUID';
    }

    // 3. Map SystemType enum values to asset types
    //    SMOKIP_A / SMOKIP_B are level-crossing (przejazd) protection systems.
    //    Other system types don't correspond to the 5 asset types — fall through.
    if (task.subsystem?.systemType) {
      if (task.subsystem.systemType === SystemType.SMOKIP_A || task.subsystem.systemType === SystemType.SMOKIP_B) {
        return 'PRZEJAZD';
      }
    }

    // 4. Default fallback
    return 'PRZEJAZD';
  }
}

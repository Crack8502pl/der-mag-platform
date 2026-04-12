// src/services/AssetCreationService.ts
// Orchestration service for creating an asset from a completed SubsystemTask

import { AppDataSource } from '../config/database';
import { Asset } from '../entities/Asset';
import { SubsystemTask, TaskWorkflowStatus } from '../entities/SubsystemTask';
import { Device } from '../entities/Device';
import { AssetService } from './AssetService';
import { DeviceLinkingService } from './DeviceLinkingService';
import { Repository } from 'typeorm';

interface AssetCreationResult {
  asset: Asset;
  linkedDevices: Device[];
  task: SubsystemTask;
  warnings?: string[];
}

export class AssetCreationService {
  private assetService: AssetService;
  private deviceLinkingService: DeviceLinkingService;
  private subsystemTaskRepository: Repository<SubsystemTask>;

  constructor() {
    this.assetService = new AssetService();
    this.deviceLinkingService = new DeviceLinkingService();
    this.subsystemTaskRepository = AppDataSource.getRepository(SubsystemTask);
  }

  /**
   * Complete task and create asset in one operation
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
    // 1. Get and validate task
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

    // 2. Determine asset type from task
    const assetType = this.deriveAssetTypeFromTask(task);

    // 3. Extract BOM from task metadata
    const bomSnapshot = task.metadata?.bom || task.metadata?.configParams?.bom || null;

    // 4. Create asset
    const asset = await this.assetService.createAsset({
      assetType,
      name: assetData.name,
      category: assetData.category,
      liniaKolejowa: assetData.liniaKolejowa,
      kilometraz: assetData.kilometraz,
      gpsLatitude: assetData.gpsLatitude,
      gpsLongitude: assetData.gpsLongitude,
      googleMapsUrl: assetData.googleMapsUrl,
      miejscowosc: assetData.miejscowosc,
      contractId: task.subsystem.contractId,
      subsystemId: task.subsystemId,
      installationTaskId: taskId,
      status: assetData.status || 'installed',
      actualInstallationDate: assetData.actualInstallationDate || new Date(),
      warrantyExpiryDate: assetData.warrantyExpiryDate,
      bomSnapshot,
      notes: assetData.notes,
      photosFolder: assetData.photosFolder
    });

    // 5. Link devices if provided
    let linkedDevices: Device[] = [];
    const warnings: string[] = [];

    if (deviceSerialNumbers && deviceSerialNumbers.length > 0) {
      const linkResult = await this.deviceLinkingService.linkDevicesAndUpdateBOM(
        asset.id,
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

    // 6. Update task status to completed (VERIFIED = final installation state)
    task.status = TaskWorkflowStatus.VERIFIED;
    task.realizationCompletedAt = new Date();
    task.linkedAssetId = asset.id;
    task.taskRole = 'installation';

    // Store asset reference in task metadata
    task.metadata = {
      ...task.metadata,
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      completedAt: new Date().toISOString()
    };

    await this.subsystemTaskRepository.save(task);

    return {
      asset,
      linkedDevices,
      task,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Derive asset type from task metadata or task type
   */
  private deriveAssetTypeFromTask(task: SubsystemTask): string {
    // 1. Check if explicitly set in task metadata
    if (task.metadata?.configParams?.assetType) {
      return task.metadata.configParams.assetType;
    }

    // 2. Check task type for keywords
    if (task.taskType) {
      const taskTypeUpper = task.taskType.toUpperCase();
      if (taskTypeUpper.includes('PRZEJAZD')) return 'PRZEJAZD';
      if (taskTypeUpper.includes('SKP')) return 'SKP';
      if (taskTypeUpper.includes('NASTAWNIA')) return 'NASTAWNIA';
      if (taskTypeUpper.includes('LCS')) return 'LCS';
      if (taskTypeUpper.includes('CUID')) return 'CUID';
    }

    // 3. Derive from subsystem systemType prefix
    if (task.subsystem?.systemType) {
      const systemType = task.subsystem.systemType;

      if (systemType.startsWith('PRZEJAZD')) return 'PRZEJAZD';
      if (systemType.startsWith('SKP')) return 'SKP';
      if (systemType.startsWith('NASTAWNIA')) return 'NASTAWNIA';
      if (systemType.startsWith('LCS')) return 'LCS';
      if (systemType.startsWith('CUID')) return 'CUID';
    }

    // 4. Default fallback
    return 'PRZEJAZD';
  }
}

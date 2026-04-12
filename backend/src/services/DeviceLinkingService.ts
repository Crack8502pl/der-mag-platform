// src/services/DeviceLinkingService.ts
// Business logic service for linking devices to assets

import { AppDataSource } from '../config/database';
import { Asset } from '../entities/Asset';
import { Device } from '../entities/Device';
import { EntityManager, Repository } from 'typeorm';

export class DeviceLinkingService {
  private assetRepository: Repository<Asset>;
  private deviceRepository: Repository<Device>;

  constructor() {
    this.assetRepository = AppDataSource.getRepository(Asset);
    this.deviceRepository = AppDataSource.getRepository(Device);
  }

  /**
   * Core linking logic executed inside a caller-provided transaction manager.
   * Normalizes + deduplicates serial numbers; batch-fetches devices in one query;
   * saves all updates in one batch call.
   */
  private async performLinking(
    manager: EntityManager,
    assetId: number,
    serialNumbers: string[]
  ): Promise<{ linked: Device[]; notFound: string[]; alreadyInstalled: string[] }> {
    const deviceRepo = manager.getRepository(Device);

    // Deduplicate and normalize serial numbers (case-insensitive)
    const normalizedMap = new Map<string, string>(); // lowercase → original (first occurrence)
    for (const sn of serialNumbers) {
      const key = sn.toLowerCase();
      if (!normalizedMap.has(key)) {
        normalizedMap.set(key, sn);
      }
    }
    const uniqueLower = Array.from(normalizedMap.keys());

    // Batch-fetch all requested devices in a single query
    const foundDevices = await deviceRepo
      .createQueryBuilder('device')
      .where('LOWER(device.serial_number) IN (:...serialNumbers)', { serialNumbers: uniqueLower })
      .getMany();

    // Build a lookup map keyed by lowercased serial number
    const deviceMap = new Map<string, Device>(
      foundDevices.map(d => [d.serialNumber.toLowerCase(), d])
    );

    const linked: Device[] = [];
    const notFound: string[] = [];
    const alreadyInstalled: string[] = [];

    for (const [lowerSn, originalSn] of normalizedMap) {
      const device = deviceMap.get(lowerSn);

      if (!device) {
        notFound.push(originalSn);
        continue;
      }

      // Check if already installed on another asset
      if (device.installedAssetId !== null && device.installedAssetId !== assetId) {
        alreadyInstalled.push(originalSn);
        continue;
      }

      // Check if device inventory status allows installation
      if (device.inventoryStatus === 'faulty' || device.inventoryStatus === 'decommissioned') {
        throw new Error(
          `Urządzenie ${originalSn} ma status ${device.inventoryStatus} i nie może być zainstalowane`
        );
      }

      // Mark device as linked (actual save done in batch below)
      device.installedAssetId = assetId;
      device.inventoryStatus = 'installed';
      linked.push(device);
    }

    // Save all linked devices in a single batch operation
    if (linked.length > 0) {
      await deviceRepo.save(linked);
    }

    return { linked, notFound, alreadyInstalled };
  }

  /**
   * Link devices to an asset using a caller-provided transaction manager.
   * Intended for use inside an outer transaction (e.g. AssetCreationService).
   */
  async linkDevicesWithManager(
    manager: EntityManager,
    assetId: number,
    serialNumbers: string[],
    bomSnapshot?: any
  ): Promise<{ linked: Device[]; notFound: string[]; alreadyInstalled: string[] }> {
    const result = await this.performLinking(manager, assetId, serialNumbers);

    // Update asset BOM snapshot within the same manager/transaction if provided
    if (bomSnapshot) {
      const assetRepo = manager.getRepository(Asset);
      const asset = await assetRepo.findOne({ where: { id: assetId } });
      if (asset) {
        asset.bomSnapshot = bomSnapshot;
        await assetRepo.save(asset);
      }
    }

    return result;
  }

  /**
   * Link devices to asset by serial numbers.
   * The entire operation is wrapped in a single DB transaction.
   */
  async linkDevicesToAsset(
    assetId: number,
    serialNumbers: string[]
  ): Promise<{ linked: Device[]; notFound: string[]; alreadyInstalled: string[] }> {
    return AppDataSource.transaction(async manager => {
      const assetRepo = manager.getRepository(Asset);

      const asset = await assetRepo.findOne({ where: { id: assetId } });
      if (!asset) {
        throw new Error('Obiekt nie znaleziony');
      }

      return this.performLinking(manager, assetId, serialNumbers);
    });
  }

  /**
   * Unlink device from asset
   */
  async unlinkDeviceFromAsset(assetId: number, deviceId: number): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId }
    });

    if (!device) {
      throw new Error('Urządzenie nie znalezione');
    }

    if (device.installedAssetId !== assetId) {
      throw new Error('Urządzenie nie jest zainstalowane na tym obiekcie');
    }

    // Unlink device
    device.installedAssetId = null;
    device.inventoryStatus = 'in_stock';

    return await this.deviceRepository.save(device);
  }

  /**
   * Get all devices installed on asset
   */
  async getAssetDevices(assetId: number): Promise<Device[]> {
    return await this.deviceRepository.find({
      where: { installedAssetId: assetId },
      order: { serialNumber: 'ASC' }
    });
  }

  /**
   * Validate installed devices against BOM snapshot
   */
  async validateAgainstBOM(assetId: number): Promise<{
    valid: boolean;
    installedDevices: Device[];
    expectedFromBOM: any[];
    missing: any[];
    extra: Device[];
    summary: {
      expectedCount: number;
      installedCount: number;
      missingCount: number;
      extraCount: number;
    };
  }> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
      relations: ['installedDevices']
    });

    if (!asset) {
      throw new Error('Obiekt nie znaleziony');
    }

    // Use the already-loaded relation instead of a second query
    const installedDevices = asset.installedDevices || [];

    // If no BOM snapshot, can't validate
    if (!asset.bomSnapshot) {
      return {
        valid: false,
        installedDevices,
        expectedFromBOM: [],
        missing: [],
        extra: installedDevices,
        summary: {
          expectedCount: 0,
          installedCount: installedDevices.length,
          missingCount: 0,
          extraCount: installedDevices.length
        }
      };
    }

    // Parse BOM snapshot
    // Assuming bomSnapshot is an array of items or an object with an items array
    const expectedFromBOM: any[] = Array.isArray(asset.bomSnapshot)
      ? asset.bomSnapshot
      : (asset.bomSnapshot as any).items || [];

    // Flatten expected serial numbers from BOM, normalized to lowercase for comparison
    const expectedSerialNumbers: string[] = [];
    expectedFromBOM.forEach((item: any) => {
      if (item.serialNumbers && Array.isArray(item.serialNumbers)) {
        expectedSerialNumbers.push(...item.serialNumbers.map((sn: string) => sn.trim().toLowerCase()));
      }
    });

    // Build a Set of installed serial numbers (normalized) for O(1) lookups
    const installedSerialNumberSet = new Set(installedDevices.map(d => d.serialNumber.trim().toLowerCase()));

    // Find missing devices (in BOM but not installed)
    const missingSerialNumbers = expectedSerialNumbers.filter(sn => !installedSerialNumberSet.has(sn));
    const missingSerialNumberSet = new Set(missingSerialNumbers);

    const missing = expectedFromBOM
      .map((item: any) => ({
        ...item,
        missingSerialNumbers: (item.serialNumbers || []).filter((sn: string) =>
          missingSerialNumberSet.has(sn.trim().toLowerCase())
        )
      }))
      .filter((item: any) => item.missingSerialNumbers.length > 0);

    // Build a Set of expected serial numbers (normalized) for O(1) lookups
    const expectedSerialNumberSet = new Set(expectedSerialNumbers);

    // Find extra devices (installed but not in BOM)
    const extra = installedDevices.filter(
      d => !expectedSerialNumberSet.has(d.serialNumber.trim().toLowerCase())
    );

    const valid = missing.length === 0 && extra.length === 0;

    return {
      valid,
      installedDevices,
      expectedFromBOM,
      missing,
      extra,
      summary: {
        expectedCount: expectedSerialNumbers.length,
        installedCount: installedDevices.length,
        missingCount: missingSerialNumbers.length,
        extraCount: extra.length
      }
    };
  }

  /**
   * Bulk link devices and update asset BOM snapshot.
   * All operations run inside a single DB transaction — asset is fetched once.
   */
  async linkDevicesAndUpdateBOM(
    assetId: number,
    serialNumbers: string[],
    bomSnapshot?: any
  ): Promise<{ asset: Asset; linked: Device[]; notFound: string[]; alreadyInstalled: string[] }> {
    return AppDataSource.transaction(async manager => {
      const assetRepo = manager.getRepository(Asset);

      // Fetch asset once with all relations needed for the response
      const asset = await assetRepo.findOne({
        where: { id: assetId },
        relations: ['installedDevices', 'contract', 'subsystem']
      });

      if (!asset) {
        throw new Error('Obiekt nie znaleziony');
      }

      const result = await this.performLinking(manager, assetId, serialNumbers);

      // Update asset BOM snapshot if provided
      if (bomSnapshot) {
        asset.bomSnapshot = bomSnapshot;
        await assetRepo.save(asset);
      }

      return { asset, ...result };
    });
  }
}

// src/services/DeviceLinkingService.ts
// Business logic service for linking devices to assets

import { AppDataSource } from '../config/database';
import { Asset } from '../entities/Asset';
import { Device } from '../entities/Device';
import { Repository } from 'typeorm';

export class DeviceLinkingService {
  private assetRepository: Repository<Asset>;
  private deviceRepository: Repository<Device>;

  constructor() {
    this.assetRepository = AppDataSource.getRepository(Asset);
    this.deviceRepository = AppDataSource.getRepository(Device);
  }

  /**
   * Link devices to asset by serial numbers
   */
  async linkDevicesToAsset(
    assetId: number,
    serialNumbers: string[]
  ): Promise<{ linked: Device[]; notFound: string[]; alreadyInstalled: string[] }> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
      relations: ['installedDevices']
    });

    if (!asset) {
      throw new Error('Obiekt nie znaleziony');
    }

    const linked: Device[] = [];
    const notFound: string[] = [];
    const alreadyInstalled: string[] = [];

    // Fetch all requested devices in a single query (case-insensitive lookup)
    const lowerSerialNumbers = serialNumbers.map(sn => sn.toLowerCase());
    const foundDevices = await this.deviceRepository
      .createQueryBuilder('device')
      .where('LOWER(device.serial_number) IN (:...serialNumbers)', { serialNumbers: lowerSerialNumbers })
      .getMany();

    // Build a lookup map keyed by lowercased serial number
    const deviceMap = new Map<string, Device>(
      foundDevices.map(d => [d.serialNumber.toLowerCase(), d])
    );

    for (const serialNumber of serialNumbers) {
      const device = deviceMap.get(serialNumber.toLowerCase());

      if (!device) {
        notFound.push(serialNumber);
        continue;
      }

      // Check if already installed on another asset
      if (device.installedAssetId !== null && device.installedAssetId !== assetId) {
        alreadyInstalled.push(serialNumber);
        continue;
      }

      // Check if device inventory status allows installation
      if (device.inventoryStatus === 'faulty' || device.inventoryStatus === 'decommissioned') {
        throw new Error(
          `Urządzenie ${serialNumber} ma status ${device.inventoryStatus} i nie może być zainstalowane`
        );
      }

      // Link device to asset
      device.installedAssetId = assetId;
      device.inventoryStatus = 'installed';
      await this.deviceRepository.save(device);

      linked.push(device);
    }

    return { linked, notFound, alreadyInstalled };
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

    const installedDevices = await this.getAssetDevices(assetId);

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

    // Flatten expected serial numbers from BOM
    const expectedSerialNumbers: string[] = [];
    expectedFromBOM.forEach((item: any) => {
      if (item.serialNumbers && Array.isArray(item.serialNumbers)) {
        expectedSerialNumbers.push(...item.serialNumbers);
      }
    });

    const installedSerialNumbers = installedDevices.map(d => d.serialNumber);

    // Find missing devices (in BOM but not installed)
    const missingSerialNumbers = expectedSerialNumbers.filter(
      sn => !installedSerialNumbers.includes(sn)
    );
    const missing = expectedFromBOM
      .map((item: any) => ({
        ...item,
        missingSerialNumbers: (item.serialNumbers || []).filter((sn: string) =>
          missingSerialNumbers.includes(sn)
        )
      }))
      .filter((item: any) => item.missingSerialNumbers.length > 0);

    // Find extra devices (installed but not in BOM)
    const extra = installedDevices.filter(
      d => !expectedSerialNumbers.includes(d.serialNumber)
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
   * Bulk link devices and update asset BOM snapshot
   */
  async linkDevicesAndUpdateBOM(
    assetId: number,
    serialNumbers: string[],
    bomSnapshot?: any
  ): Promise<{ asset: Asset; linked: Device[]; notFound: string[]; alreadyInstalled: string[] }> {
    const result = await this.linkDevicesToAsset(assetId, serialNumbers);

    // Update asset BOM snapshot if provided
    if (bomSnapshot) {
      const assetToUpdate = await this.assetRepository.findOne({ where: { id: assetId } });
      if (assetToUpdate) {
        assetToUpdate.bomSnapshot = bomSnapshot;
        await this.assetRepository.save(assetToUpdate);
      }
    }

    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
      relations: ['installedDevices', 'contract', 'subsystem']
    });

    if (!asset) {
      throw new Error('Obiekt nie znaleziony');
    }

    return {
      asset,
      ...result
    };
  }
}

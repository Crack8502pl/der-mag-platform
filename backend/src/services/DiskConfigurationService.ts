// src/services/DiskConfigurationService.ts
// Service for calculating required storage capacity and selecting optimal disk configuration

import { AppDataSource } from '../config/database';
import { DiskSpecification } from '../entities/DiskSpecification';

export interface DiskSelection {
  diskId: number;
  quantity: number;
  capacityTb: number;
  totalTb: number;
}

export class DiskConfigurationService {
  /**
   * Calculate required storage in TB.
   * Formula: (cameras × bitrate_mbps) × (days × 0.0108)
   *
   * The constant 0.0108 represents TB per (Mbps × day):
   *   1 Mbps × 1 day = 1_000_000 bit/s × 86_400 s / 8 bytes/bit / 1_000_000_000_000 bytes/TB
   *                  = 86_400_000_000 bytes / 1_000_000_000_000 = 0.0108 TB
   */
  static calculateRequiredStorage(
    cameraCount: number,
    days: number,
    bitrateMbps: number = 4.0
  ): number {
    return cameraCount * bitrateMbps * days * 0.0108;
  }

  /**
   * Select the optimal disk configuration that meets the required storage
   * while minimising the number of disks used.
   *
   * Algorithm:
   * 1. Filter disks that are compatible with the recorder (or universally compatible).
   * 2. Sort by capacity descending, then priority ascending.
   * 3. Greedily fill disk slots with the largest available disk until capacity is met.
   */
  static async selectOptimalDisks(
    requiredTb: number,
    recorderId: number,
    diskSlots: number
  ): Promise<DiskSelection[]> {
    const diskRepo = AppDataSource.getRepository(DiskSpecification);

    const allDisks = await diskRepo.find({
      where: { isActive: true },
      order: { capacityTb: 'DESC', priority: 'ASC' }
    });

    // Filter for compatibility
    const compatibleDisks = allDisks.filter(disk => {
      const compatible = disk.compatibleRecorderIds as number[];
      return compatible.length === 0 || compatible.includes(recorderId);
    });

    if (compatibleDisks.length === 0) {
      return [];
    }

    const selections: DiskSelection[] = [];
    let remaining = requiredTb;

    // Try to fill the slots using the largest disk available
    for (const disk of compatibleDisks) {
      if (remaining <= 0) break;

      const capacityTb = Number(disk.capacityTb);
      // How many of this disk size do we need for the remaining capacity?
      const needed = Math.ceil(remaining / capacityTb);
      // But we cannot use more slots than available
      const usedSlots = selections.reduce((acc, s) => acc + s.quantity, 0);
      const availableSlots = diskSlots - usedSlots;
      if (availableSlots <= 0) break;

      const quantity = Math.min(needed, availableSlots);
      const totalTb = quantity * capacityTb;

      selections.push({
        diskId: disk.id,
        quantity,
        capacityTb,
        totalTb
      });

      remaining -= totalTb;
    }

    if (remaining > 0) {
      // Not enough capacity could be allocated with the available slots/disks.
      // Signal failure by returning no valid configuration.
      return [];
    }

    return selections;
  }

  /**
   * Get all active disk specifications.
   */
  static async getAllDisks(): Promise<DiskSpecification[]> {
    const repo = AppDataSource.getRepository(DiskSpecification);
    return repo.find({
      where: { isActive: true },
      relations: ['warehouseStock'],
      order: { capacityTb: 'DESC', priority: 'ASC' }
    });
  }

  /**
   * Get a single disk specification by ID.
   */
  static async getDisk(id: number): Promise<DiskSpecification | null> {
    const repo = AppDataSource.getRepository(DiskSpecification);
    return repo.findOne({
      where: { id },
      relations: ['warehouseStock']
    });
  }

  /**
   * Create a new disk specification.
   */
  static async createDisk(data: Partial<DiskSpecification>): Promise<DiskSpecification> {
    const repo = AppDataSource.getRepository(DiskSpecification);
    const disk = repo.create(data);
    return repo.save(disk);
  }

  /**
   * Update an existing disk specification.
   */
  static async updateDisk(id: number, data: Partial<DiskSpecification>): Promise<DiskSpecification> {
    const repo = AppDataSource.getRepository(DiskSpecification);
    const disk = await repo.findOne({ where: { id } });
    if (!disk) {
      throw new Error(`DiskSpecification with id ${id} not found`);
    }
    Object.assign(disk, data);
    return repo.save(disk);
  }

  /**
   * Delete a disk specification.
   */
  static async deleteDisk(id: number): Promise<void> {
    const repo = AppDataSource.getRepository(DiskSpecification);
    await repo.delete(id);
  }
}

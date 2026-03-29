// src/services/RecorderSelectionService.ts
// Service for selecting appropriate recorders and compatible disks based on camera count

import { AppDataSource } from '../config/database';
import { RecorderSpecification } from '../entities/RecorderSpecification';
import { DiskSpecification } from '../entities/DiskSpecification';

export class RecorderSelectionService {
  /**
   * Select the most appropriate recorder for the given camera count.
   * Returns the recorder with the smallest max_cameras that still covers cameraCount.
   */
  static async selectRecorder(cameraCount: number): Promise<RecorderSpecification | null> {
    const repo = AppDataSource.getRepository(RecorderSpecification);

    const recorder = await repo
      .createQueryBuilder('rs')
      .leftJoinAndSelect('rs.warehouseStock', 'ws')
      .where('rs.is_active = true')
      .andWhere('rs.min_cameras <= :count', { count: cameraCount })
      .andWhere('rs.max_cameras >= :count', { count: cameraCount })
      .orderBy('rs.max_cameras', 'ASC')
      .getOne();

    return recorder;
  }

  /**
   * Get all active recorders ordered by camera range.
   */
  static async getAllRecorders(): Promise<RecorderSpecification[]> {
    const repo = AppDataSource.getRepository(RecorderSpecification);
    return repo.find({
      where: { isActive: true },
      relations: ['warehouseStock', 'extensionWarehouseStock'],
      order: { maxCameras: 'ASC' }
    });
  }

  /**
   * Get a single recorder specification by ID.
   */
  static async getRecorder(id: number): Promise<RecorderSpecification | null> {
    const repo = AppDataSource.getRepository(RecorderSpecification);
    return repo.findOne({
      where: { id },
      relations: ['warehouseStock', 'extensionWarehouseStock']
    });
  }

  /**
   * Get all active disk specifications compatible with the given recorder.
   * If compatibleRecorderIds is empty on a disk, it is considered universally compatible.
   */
  static async getCompatibleDisks(recorderId: number): Promise<DiskSpecification[]> {
    const diskRepo = AppDataSource.getRepository(DiskSpecification);

    const allDisks = await diskRepo.find({
      where: { isActive: true },
      relations: ['warehouseStock'],
      order: { capacityTb: 'DESC', priority: 'ASC' }
    });

    return allDisks.filter(disk => {
      const compatible = disk.compatibleRecorderIds as number[];
      return compatible.length === 0 || compatible.includes(recorderId);
    });
  }

  /**
   * Create a new recorder specification.
   */
  static async createRecorder(data: Partial<RecorderSpecification>): Promise<RecorderSpecification> {
    const repo = AppDataSource.getRepository(RecorderSpecification);
    const recorder = repo.create(data);
    return repo.save(recorder);
  }

  /**
   * Update an existing recorder specification.
   */
  static async updateRecorder(id: number, data: Partial<RecorderSpecification>): Promise<RecorderSpecification> {
    const repo = AppDataSource.getRepository(RecorderSpecification);
    const recorder = await repo.findOne({ where: { id } });
    if (!recorder) {
      throw new Error(`RecorderSpecification with id ${id} not found`);
    }
    Object.assign(recorder, data);
    return repo.save(recorder);
  }

  /**
   * Delete a recorder specification.
   */
  static async deleteRecorder(id: number): Promise<void> {
    const repo = AppDataSource.getRepository(RecorderSpecification);
    await repo.delete(id);
  }
}

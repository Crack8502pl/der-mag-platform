import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database';
import { DiskSpecification } from '../entities/DiskSpecification';
import { WarehouseStock } from '../entities/WarehouseStock';
import { RecorderSpecification } from '../entities/RecorderSpecification';
import { ImportMode } from './RecorderSpecificationService';

export interface DiskExportJson {
  capacityTb: number;
  diskType: string;
  priority: number;
  isActive: boolean;
  warehouseStockRef: { catalogNumber: string };
  compatibleRecorderRefs: Array<{ modelName: string }>;
}

export interface DiskImportStats {
  disksImported: number;
  skipped: number;
  errors: string[];
}

export interface DiskImportOptions {
  mode?: ImportMode;
  manager?: EntityManager;
}

export class DiskSpecificationService {
  static async exportToJsonArray(manager?: EntityManager): Promise<DiskExportJson[]> {
    const entityManager = manager ?? AppDataSource.manager;
    const diskRepo = entityManager.getRepository(DiskSpecification);
    const recorderRepo = entityManager.getRepository(RecorderSpecification);

    const [disks, recorders] = await Promise.all([
      diskRepo.find({
        where: { isActive: true },
        relations: ['warehouseStock'],
        order: { priority: 'ASC', capacityTb: 'ASC' }
      }),
      recorderRepo.find()
    ]);

    const recorderById = new Map(recorders.map((recorder) => [recorder.id, recorder.modelName]));

    return disks.map((disk) => ({
      capacityTb: Number(disk.capacityTb),
      diskType: disk.diskType,
      priority: disk.priority,
      isActive: disk.isActive,
      warehouseStockRef: {
        catalogNumber: disk.warehouseStock?.catalogNumber || ''
      },
      compatibleRecorderRefs: (disk.compatibleRecorderIds ?? [])
        .map((recorderId) => recorderById.get(recorderId))
        .filter((modelName): modelName is string => Boolean(modelName))
        .map((modelName) => ({ modelName }))
    }));
  }

  static async importFromJsonArray(
    disks: DiskExportJson[] = [],
    options?: DiskImportOptions
  ): Promise<DiskImportStats> {
    const mode = options?.mode ?? 'SKIP';
    const entityManager = options?.manager ?? AppDataSource.manager;

    const diskRepo = entityManager.getRepository(DiskSpecification);
    const warehouseRepo = entityManager.getRepository(WarehouseStock);
    const recorderRepo = entityManager.getRepository(RecorderSpecification);

    const stats: DiskImportStats = {
      disksImported: 0,
      skipped: 0,
      errors: []
    };

    for (const diskData of disks) {
      try {
        const catalogNumber = diskData.warehouseStockRef?.catalogNumber?.trim();
        if (!catalogNumber) {
          stats.errors.push(`Dysk ${diskData.capacityTb ?? 'UNKNOWN'} TB: brak warehouseStockRef.catalogNumber`);
          continue;
        }

        const warehouseStock = await warehouseRepo.findOne({ where: { catalogNumber } });
        if (!warehouseStock) {
          stats.errors.push(`Dysk ${diskData.capacityTb ?? 'UNKNOWN'} TB: nie znaleziono WarehouseStock dla ${catalogNumber}`);
          continue;
        }

        const compatibleRecorderIds: number[] = [];
        for (const recorderRef of diskData.compatibleRecorderRefs ?? []) {
          const modelName = recorderRef.modelName?.trim();
          if (!modelName) {
            continue;
          }

          const recorder = await recorderRepo.findOne({ where: { modelName } });
          if (!recorder) {
            stats.errors.push(`Dysk ${catalogNumber}: nie znaleziono rejestratora ${modelName}`);
            continue;
          }
          compatibleRecorderIds.push(recorder.id);
        }

        const existing = await diskRepo.findOne({
          where: {
            warehouseStockId: warehouseStock.id,
            capacityTb: Number(diskData.capacityTb)
          }
        });

        if (existing) {
          if (mode === 'SKIP') {
            stats.skipped += 1;
            continue;
          }

          existing.diskType = diskData.diskType as any;
          existing.priority = diskData.priority ?? 10;
          existing.isActive = diskData.isActive !== false;
          existing.compatibleRecorderIds = compatibleRecorderIds;
          await diskRepo.save(existing);
          stats.disksImported += 1;
          continue;
        }

        const created = diskRepo.create({
          warehouseStockId: warehouseStock.id,
          capacityTb: Number(diskData.capacityTb),
          diskType: diskData.diskType as any,
          priority: diskData.priority ?? 10,
          isActive: diskData.isActive !== false,
          compatibleRecorderIds
        });

        await diskRepo.save(created);
        stats.disksImported += 1;
      } catch (error: any) {
        stats.errors.push(`Dysk ${diskData?.warehouseStockRef?.catalogNumber ?? 'UNKNOWN'}: ${error.message}`);
      }
    }

    return stats;
  }
}

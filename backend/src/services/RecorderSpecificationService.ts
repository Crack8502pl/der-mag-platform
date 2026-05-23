import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database';
import { RecorderSpecification } from '../entities/RecorderSpecification';
import { WarehouseStock } from '../entities/WarehouseStock';

export type ImportMode = 'SKIP' | 'OVERWRITE' | 'MERGE';

export interface RecorderJsonRef {
  catalogNumber: string;
}

export interface RecorderExportJson {
  modelName: string;
  minCameras: number;
  maxCameras: number;
  diskSlots: number;
  maxStorageTb: number | null;
  supportedDiskCapacities: number[];
  requiresExtension: boolean;
  isActive: boolean;
  notes: string | null;
  warehouseStockRef: RecorderJsonRef;
  extensionWarehouseStockRef: RecorderJsonRef | null;
}

export interface RecorderImportStats {
  recordersImported: number;
  skipped: number;
  errors: string[];
}

export interface RecorderImportOptions {
  mode?: ImportMode;
  manager?: EntityManager;
}

export class RecorderSpecificationService {
  static async exportToJsonArray(manager?: EntityManager): Promise<RecorderExportJson[]> {
    const entityManager = manager ?? AppDataSource.manager;
    const recorderRepo = entityManager.getRepository(RecorderSpecification);

    const recorders = await recorderRepo.find({
      where: { isActive: true },
      relations: ['warehouseStock', 'extensionWarehouseStock'],
      order: { modelName: 'ASC' }
    });

    return recorders.map((recorder) => ({
      modelName: recorder.modelName,
      minCameras: recorder.minCameras,
      maxCameras: recorder.maxCameras,
      diskSlots: recorder.diskSlots,
      maxStorageTb: recorder.maxStorageTb,
      supportedDiskCapacities: recorder.supportedDiskCapacities ?? [],
      requiresExtension: recorder.requiresExtension,
      isActive: recorder.isActive,
      notes: recorder.notes ?? null,
      warehouseStockRef: {
        catalogNumber: recorder.warehouseStock?.catalogNumber || ''
      },
      extensionWarehouseStockRef: recorder.extensionWarehouseStock?.catalogNumber
        ? { catalogNumber: recorder.extensionWarehouseStock.catalogNumber }
        : null
    }));
  }

  static async importFromJsonArray(
    recorders: RecorderExportJson[] = [],
    options?: RecorderImportOptions
  ): Promise<RecorderImportStats> {
    const mode = options?.mode ?? 'SKIP';
    const entityManager = options?.manager ?? AppDataSource.manager;
    const recorderRepo = entityManager.getRepository(RecorderSpecification);
    const warehouseRepo = entityManager.getRepository(WarehouseStock);

    const stats: RecorderImportStats = {
      recordersImported: 0,
      skipped: 0,
      errors: []
    };

    for (const recorderData of recorders) {
      try {
        if (!recorderData.modelName) {
          stats.errors.push('Pominięto rejestrator bez modelName');
          continue;
        }

        const warehouseCatalog = recorderData.warehouseStockRef?.catalogNumber?.trim();
        if (!warehouseCatalog) {
          stats.errors.push(`Rejestrator ${recorderData.modelName}: brak warehouseStockRef.catalogNumber`);
          continue;
        }

        const warehouseStock = await warehouseRepo.findOne({ where: { catalogNumber: warehouseCatalog } });
        if (!warehouseStock) {
          stats.errors.push(`Rejestrator ${recorderData.modelName}: nie znaleziono WarehouseStock dla ${warehouseCatalog}`);
          continue;
        }

        let extensionWarehouseStockId: number | null = null;
        const extensionCatalog = recorderData.extensionWarehouseStockRef?.catalogNumber?.trim();
        if (extensionCatalog) {
          const extensionWarehouseStock = await warehouseRepo.findOne({ where: { catalogNumber: extensionCatalog } });
          if (!extensionWarehouseStock) {
            stats.errors.push(`Rejestrator ${recorderData.modelName}: nie znaleziono extension WarehouseStock dla ${extensionCatalog}`);
            continue;
          }
          extensionWarehouseStockId = extensionWarehouseStock.id;
        }

        const existing = await recorderRepo.findOne({ where: { modelName: recorderData.modelName } });
        const trimmedNotes = recorderData.notes?.trim();
        const normalizedNotes = trimmedNotes ? trimmedNotes : null;

        if (existing) {
          if (mode === 'SKIP') {
            stats.skipped += 1;
            continue;
          }

          existing.warehouseStockId = warehouseStock.id;
          existing.minCameras = recorderData.minCameras;
          existing.maxCameras = recorderData.maxCameras;
          existing.diskSlots = recorderData.diskSlots;
          existing.maxStorageTb = recorderData.maxStorageTb;
          existing.supportedDiskCapacities = recorderData.supportedDiskCapacities ?? [];
          existing.requiresExtension = Boolean(recorderData.requiresExtension);
          existing.extensionWarehouseStockId = extensionWarehouseStockId;
          existing.isActive = recorderData.isActive !== false;
          existing.notes = normalizedNotes;
          await recorderRepo.save(existing);
          stats.recordersImported += 1;
          continue;
        }

        const created = recorderRepo.create({
          warehouseStockId: warehouseStock.id,
          modelName: recorderData.modelName,
          minCameras: recorderData.minCameras,
          maxCameras: recorderData.maxCameras,
          diskSlots: recorderData.diskSlots,
          maxStorageTb: recorderData.maxStorageTb,
          supportedDiskCapacities: recorderData.supportedDiskCapacities ?? [],
          requiresExtension: Boolean(recorderData.requiresExtension),
          extensionWarehouseStockId,
          isActive: recorderData.isActive !== false,
          notes: normalizedNotes
        });

        await recorderRepo.save(created);
        stats.recordersImported += 1;
      } catch (error: any) {
        stats.errors.push(`Rejestrator ${recorderData?.modelName ?? 'UNKNOWN'}: ${error.message}`);
      }
    }

    return stats;
  }
}

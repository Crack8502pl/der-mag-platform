// src/services/WarehouseCleanupService.ts
// Serwis do automatycznej dezaktywacji towarów bez stanu

import { AppDataSource } from '../config/database';
import { WarehouseStock, StockStatus } from '../entities/WarehouseStock';
import { WarehouseStockHistory, StockOperationType } from '../entities/WarehouseStockHistory';

export interface CleanupResult {
  success: boolean;
  processed: number;
  deactivated: number;
  errors: string[];
  startedAt: Date;
  completedAt: Date;
}

export class WarehouseCleanupService {
  /**
   * Dezaktywuj towary które mają stan 0 przez ostatnie 7 dni
   */
  static async deactivateZeroStockItems(): Promise<CleanupResult> {
    const startedAt = new Date();
    const errors: string[] = [];
    let processed = 0;
    let deactivated = 0;

    const stockRepo = AppDataSource.getRepository(WarehouseStock);
    const historyRepo = AppDataSource.getRepository(WarehouseStockHistory);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const itemsToDeactivate = await stockRepo
      .createQueryBuilder('stock')
      .where('stock.quantityInStock = 0')
      .andWhere('stock.status IN (:...statuses)', {
        statuses: [StockStatus.ACTIVE, StockStatus.OUT_OF_STOCK],
      })
      .andWhere('stock.updatedAt < :sevenDaysAgo', { sevenDaysAgo })
      .getMany();

    for (const item of itemsToDeactivate) {
      processed++;
      try {
        const oldStatus = item.status;
        item.status = StockStatus.DISCONTINUED;
        item.isActive = false;
        await stockRepo.save(item);

        const historyEntry = historyRepo.create({
          warehouseStockId: item.id,
          operationType: StockOperationType.STATUS_CHANGE,
          details: {
            reason: 'AUTO_DEACTIVATION',
            message: 'Automatyczna dezaktywacja - stan 0 przez 7+ dni',
            previousStatus: oldStatus,
            newStatus: StockStatus.DISCONTINUED,
          },
          notes: 'Automatyczna dezaktywacja przez system (CRON)',
        });
        await historyRepo.save(historyEntry);

        deactivated++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Błąd dla ${item.catalogNumber}: ${msg}`);
      }
    }

    return {
      success: errors.length === 0,
      processed,
      deactivated,
      errors,
      startedAt,
      completedAt: new Date(),
    };
  }
}

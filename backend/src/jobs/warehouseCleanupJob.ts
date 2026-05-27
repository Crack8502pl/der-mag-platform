// src/jobs/warehouseCleanupJob.ts
// CRON Job: Automatyczna dezaktywacja towarów ze stanem 0 przez 7+ dni

import * as cron from 'node-cron';
import { WarehouseCleanupService } from '../services/WarehouseCleanupService';
import { CronConfigService } from '../services/CronConfigService';

let cleanupTask: cron.ScheduledTask | null = null;

const warehouseCleanupRunner = async (): Promise<void> => {
  console.log('🧹 [CRON] Uruchamiam automatyczne czyszczenie magazynu...');
  try {
    const result = await WarehouseCleanupService.deactivateZeroStockItems();
    console.log(`✅ [CRON] Dezaktywowano ${result.deactivated} z ${result.processed} towarów`);
    if (result.errors.length > 0) {
      console.warn('⚠️ [CRON] Błędy:', result.errors);
    }
  } catch (error) {
    console.error('❌ [CRON] Błąd czyszczenia magazynu:', error);
  }
};

export const scheduleWarehouseCleanup = (): void => {
  const cronExpression = CronConfigService.getById('warehouse_cleanup')?.cronExpression || '0 3 * * *';

  cleanupTask = cron.schedule(cronExpression, warehouseCleanupRunner);

  CronConfigService.registerJob('warehouse_cleanup', warehouseCleanupRunner, cleanupTask);

  console.log(`📅 [CRON] Zaplanowano automatyczne czyszczenie magazynu (${cronExpression})`);
};

export const stopWarehouseCleanupJob = (): void => {
  if (cleanupTask) {
    cleanupTask.stop();
    cleanupTask = null;
    console.log('⏹️  [CRON] Automatyczne czyszczenie magazynu zatrzymane');
  }
};

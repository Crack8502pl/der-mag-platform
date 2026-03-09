// src/jobs/warehouseCleanupJob.ts
// CRON Job: Automatyczna dezaktywacja towarów ze stanem 0 przez 7+ dni

import * as cron from 'node-cron';
import { WarehouseCleanupService } from '../services/WarehouseCleanupService';

let cleanupTask: cron.ScheduledTask | null = null;

export const scheduleWarehouseCleanup = (): void => {
  // Uruchamiaj codziennie o 3:00 w nocy (format: minuta godzina dzień miesiąc dzień_tygodnia)
  cleanupTask = cron.schedule('0 3 * * *', async () => {
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
  });

  console.log('📅 [CRON] Zaplanowano automatyczne czyszczenie magazynu (codziennie o 3:00)');
};

export const stopWarehouseCleanupJob = (): void => {
  if (cleanupTask) {
    cleanupTask.stop();
    cleanupTask = null;
    console.log('⏹️  [CRON] Automatyczne czyszczenie magazynu zatrzymane');
  }
};

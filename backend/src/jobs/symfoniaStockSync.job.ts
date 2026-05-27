// src/jobs/symfoniaStockSync.job.ts
// CRON Job: Automatyczna synchronizacja stanów magazynowych co 1 godzinę
// READ-ONLY from Symfonia MSSQL

import * as cron from 'node-cron';
import { SymfoniaSyncService } from '../services/SymfoniaSyncService';
import { CronConfigService } from '../services/CronConfigService';

let syncTask: cron.ScheduledTask | null = null;

const stockSyncRunner = async (): Promise<void> => {
  console.log('🔄 [CRON] Rozpoczynam automatyczną synchronizację stanów magazynowych...');
  try {
    const result = await SymfoniaSyncService.quickStockSync();
    console.log(`✅ [CRON] Synchronizacja zakończona: ${result.stats.updated} zaktualizowanych, ${result.stats.skipped} pominiętych`);
  } catch (error) {
    console.error('❌ [CRON] Błąd synchronizacji:', error);
  }
};

export const startSymfoniaStockSyncJob = (): void => {
  if (process.env.SYMFONIA_SYNC_ENABLED === 'false') {
    console.log('⏸️  CRON Job: Synchronizacja Symfonia wyłączona (SYMFONIA_SYNC_ENABLED=false)');
    CronConfigService.update('stock_sync', CronConfigService.getById('stock_sync')?.cronExpression || '0 * * * *', false);
    return;
  }

  const cronExpression = CronConfigService.getById('stock_sync')?.cronExpression || process.env.SYMFONIA_SYNC_CRON_EXPRESSION || '0 * * * *';

  syncTask = cron.schedule(cronExpression, stockSyncRunner);

  CronConfigService.registerJob('stock_sync', stockSyncRunner, syncTask);

  console.log(`✅ CRON Job: Synchronizacja stanów magazynowych (${cronExpression}) - aktywny`);
};

export const stopSymfoniaStockSyncJob = (): void => {
  if (syncTask) {
    syncTask.stop();
    syncTask = null;
    console.log('⏹️  CRON Job: Synchronizacja Symfonia zatrzymana');
  }
};

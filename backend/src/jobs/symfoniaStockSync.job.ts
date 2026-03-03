// src/jobs/symfoniaStockSync.job.ts
// CRON Job: Automatyczna synchronizacja stanów magazynowych co 1 godzinę
// READ-ONLY from Symfonia MSSQL

import * as cron from 'node-cron';
import { SymfoniaSyncService } from '../services/SymfoniaSyncService';

let syncTask: cron.ScheduledTask | null = null;

export const startSymfoniaStockSyncJob = (): void => {
  if (process.env.SYMFONIA_SYNC_ENABLED === 'false') {
    console.log('⏸️  CRON Job: Synchronizacja Symfonia wyłączona (SYMFONIA_SYNC_ENABLED=false)');
    return;
  }

  const cronExpression = process.env.SYMFONIA_SYNC_CRON_EXPRESSION || '0 * * * *';

  syncTask = cron.schedule(cronExpression, async () => {
    console.log('🔄 [CRON] Rozpoczynam automatyczną synchronizację stanów magazynowych...');
    try {
      const result = await SymfoniaSyncService.quickStockSync();
      console.log(`✅ [CRON] Synchronizacja zakończona: ${result.stats.updated} zaktualizowanych, ${result.stats.skipped} pominiętych`);
    } catch (error) {
      console.error('❌ [CRON] Błąd synchronizacji:', error);
    }
  });

  console.log(`✅ CRON Job: Synchronizacja stanów magazynowych (${cronExpression}) - aktywny`);
};

export const stopSymfoniaStockSyncJob = (): void => {
  if (syncTask) {
    syncTask.stop();
    syncTask = null;
    console.log('⏹️  CRON Job: Synchronizacja Symfonia zatrzymana');
  }
};

// src/jobs/symfoniaCarSync.job.ts
// CRON Job: Automatyczna synchronizacja samochodów co 12 godzin

import * as cron from 'node-cron';
import { SymfoniaCarSyncService } from '../services/SymfoniaCarSyncService';

let syncTask: cron.ScheduledTask | null = null;

export const startSymfoniaCarSyncJob = (): void => {
  if (process.env.SYMFONIA_SYNC_ENABLED === 'false') {
    console.log('⏸️  CRON Job: Synchronizacja samochodów wyłączona (SYMFONIA_SYNC_ENABLED=false)');
    return;
  }

  // Co 12 godzin: 0:00 i 12:00
  const cronExpression = process.env.SYMFONIA_CARS_SYNC_CRON || '0 */12 * * *';

  syncTask = cron.schedule(cronExpression, async () => {
    console.log('🚗 [CRON] Rozpoczynam synchronizację samochodów...');
    try {
      const result = await SymfoniaCarSyncService.syncCars();
      console.log(
        `✅ [CRON] Synchronizacja samochodów zakończona: ${result.stats.created} dodanych, ` +
        `${result.stats.archived} zarchiwizowanych, ${result.stats.errors} błędów`
      );
    } catch (error) {
      console.error('❌ [CRON] Błąd synchronizacji samochodów:', error);
    }
  });

  console.log(`✅ CRON Job: Synchronizacja samochodów (${cronExpression}) - aktywny`);
};

export const stopSymfoniaCarSyncJob = (): void => {
  if (syncTask) {
    syncTask.stop();
    syncTask = null;
    console.log('⏹️  CRON Job: Synchronizacja samochodów zatrzymana');
  }
};

// src/jobs/symfoniaCarSync.job.ts
// CRON Job: Automatyczna synchronizacja samochodów co 12 godzin

import * as cron from 'node-cron';
import { SymfoniaCarSyncService } from '../services/SymfoniaCarSyncService';
import { CronConfigService } from '../services/CronConfigService';

const DEFAULT_CRON = '0 */12 * * *';

let syncTask: cron.ScheduledTask | null = null;

const carSyncRunner = async (): Promise<void> => {
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
};

export const startSymfoniaCarSyncJob = (): void => {
  if (process.env.SYMFONIA_SYNC_ENABLED === 'false') {
    console.log('⏸️  CRON Job: Synchronizacja samochodów wyłączona (SYMFONIA_SYNC_ENABLED=false)');
    CronConfigService.update('cars_sync', CronConfigService.getById('cars_sync')?.cronExpression || DEFAULT_CRON, false);
    return;
  }

  // Co 12 godzin: 0:00 i 12:00
  const cronExpression = CronConfigService.getById('cars_sync')?.cronExpression || process.env.SYMFONIA_CARS_SYNC_CRON || DEFAULT_CRON;

  syncTask = cron.schedule(cronExpression, carSyncRunner);

  CronConfigService.registerJob('cars_sync', carSyncRunner, syncTask);

  console.log(`✅ CRON Job: Synchronizacja samochodów (${cronExpression}) - aktywny`);
};

export const stopSymfoniaCarSyncJob = (): void => {
  if (syncTask) {
    syncTask.stop();
    syncTask = null;
    console.log('⏹️  CRON Job: Synchronizacja samochodów zatrzymana');
  }
};

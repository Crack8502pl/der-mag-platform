// src/jobs/symfoniaContractSync.job.ts
// CRON Jobs: Automatyczna synchronizacja kontraktów z Symfonii
// - Pełna synchronizacja co 3 godziny (pobiera nowe + sprawdza kierowników)
// - Szybka synchronizacja co 1 godzinę (aktualizuje tylko kierowników)

import * as cron from 'node-cron';
import { SymfoniaContractSyncService } from '../services/SymfoniaContractSyncService';
import { CronConfigService } from '../services/CronConfigService';

let fullSyncTask: cron.ScheduledTask | null = null;
let quickSyncTask: cron.ScheduledTask | null = null;

const fullSyncRunner = async (): Promise<void> => {
  console.log('🔄 [CRON] Rozpoczynam pełną synchronizację kontraktów...');
  try {
    const result = await SymfoniaContractSyncService.fullSyncFromCron();
    console.log(`✅ [CRON] Pełna synchronizacja kontraktów: ${result.stats.created} nowych, ${result.stats.updated} zaktualizowanych`);
  } catch (error) {
    console.error('❌ [CRON] Błąd pełnej synchronizacji kontraktów:', error);
  }
};

const quickSyncRunner = async (): Promise<void> => {
  console.log('⚡ [CRON] Rozpoczynam szybką synchronizację kierowników kontraktów...');
  try {
    const result = await SymfoniaContractSyncService.quickSync();
    console.log(`✅ [CRON] Szybka synchronizacja kierowników: ${result.stats.updated} zaktualizowanych`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === 'Synchronizacja kontraktów jest już uruchomiona') {
      console.warn('⚠️  [CRON] Pominięto szybką synchronizację – synchronizacja jest już aktywna');
    } else {
      console.error('❌ [CRON] Błąd szybkiej synchronizacji kontraktów:', error);
    }
  }
};

export const startSymfoniaContractSyncJobs = (): void => {
  if (process.env.SYMFONIA_SYNC_ENABLED === 'false') {
    console.log('⏸️  CRON Jobs: Synchronizacja kontraktów wyłączona (SYMFONIA_SYNC_ENABLED=false)');
    return;
  }

  // Pełna synchronizacja co 3 godziny (0:00, 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00)
  const fullSyncCron = CronConfigService.getById('contracts_full')?.cronExpression || process.env.SYMFONIA_CONTRACTS_FULL_SYNC_CRON || '0 */3 * * *';

  fullSyncTask = cron.schedule(fullSyncCron, fullSyncRunner);
  CronConfigService.registerJob('contracts_full', fullSyncRunner, fullSyncTask);

  // Szybka synchronizacja co 1 godzinę z offsetem 30 minut (aktualizacja kierowników)
  // Offset 30 minut zapobiega kolizji z fullSync uruchamianym o pełnej godzinie (0 */3 * * *)
  const quickSyncCron = CronConfigService.getById('contracts_quick')?.cronExpression || process.env.SYMFONIA_CONTRACTS_QUICK_SYNC_CRON || '30 * * * *';

  quickSyncTask = cron.schedule(quickSyncCron, quickSyncRunner);
  CronConfigService.registerJob('contracts_quick', quickSyncRunner, quickSyncTask);

  console.log(`✅ CRON Jobs: Synchronizacja kontraktów aktywna`);
  console.log(`   - Pełna synchronizacja: ${fullSyncCron} (co 3h)`);
  console.log(`   - Szybka synchronizacja kierowników: ${quickSyncCron} (co 1h)`);
};

export const stopSymfoniaContractSyncJobs = (): void => {
  if (fullSyncTask) {
    fullSyncTask.stop();
    fullSyncTask = null;
  }
  if (quickSyncTask) {
    quickSyncTask.stop();
    quickSyncTask = null;
  }
  console.log('⏹️  CRON Jobs: Synchronizacja kontraktów zatrzymana');
};

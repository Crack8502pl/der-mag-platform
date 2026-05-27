// src/jobs/cleanExpiredDrafts.ts
// CRON Job: Czyszczenie wygasłych draftów wizardów

import * as cron from 'node-cron';
import { AppDataSource } from '../config/database';
import { WizardDraft } from '../entities/WizardDraft';
import { LessThan } from 'typeorm';
import { CronConfigService } from '../services/CronConfigService';

let cleanDraftsTask: cron.ScheduledTask | null = null;

export async function cleanExpiredDrafts(): Promise<void> {
  try {
    const repository = AppDataSource.getRepository(WizardDraft);
    const result = await repository.delete({
      expiresAt: LessThan(new Date()),
    });

    if (result.affected && result.affected > 0) {
      console.log(`🧹 Cleaned ${result.affected} expired wizard drafts`);
    }
  } catch (error) {
    console.error('❌ Error cleaning expired drafts:', error);
  }
}

export const scheduleCleanExpiredDrafts = (): void => {
  const cronExpression = CronConfigService.getById('clean_drafts')?.cronExpression || '0 * * * *';

  cleanDraftsTask = cron.schedule(cronExpression, async () => {
    await cleanExpiredDrafts();
  });

  CronConfigService.registerJob('clean_drafts', cleanExpiredDrafts, cleanDraftsTask);

  console.log(`📅 [CRON] Zaplanowano czyszczenie wygasłych draftów wizardów (${cronExpression})`);
};

export const stopCleanExpiredDraftsJob = (): void => {
  if (cleanDraftsTask) {
    cleanDraftsTask.stop();
    cleanDraftsTask = null;
  }
};

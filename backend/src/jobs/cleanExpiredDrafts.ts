// src/jobs/cleanExpiredDrafts.ts
// CRON Job: Czyszczenie wygasłych draftów wizardów

import * as cron from 'node-cron';
import { AppDataSource } from '../config/database';
import { WizardDraft } from '../entities/WizardDraft';
import { LessThan } from 'typeorm';

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
  // Uruchamiaj co godzinę
  cleanDraftsTask = cron.schedule('0 * * * *', async () => {
    await cleanExpiredDrafts();
  });

  console.log('📅 [CRON] Zaplanowano czyszczenie wygasłych draftów wizardów (co godzinę)');
};

export const stopCleanExpiredDraftsJob = (): void => {
  if (cleanDraftsTask) {
    cleanDraftsTask.stop();
    cleanDraftsTask = null;
  }
};

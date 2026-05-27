// src/services/CronConfigService.ts
// Singleton managing runtime CRON job configuration — allows changing schedules without server restart

import * as cron from 'node-cron';

export interface CronJobConfig {
  jobId: string;
  label: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: Date | null;
  nextRun?: Date | null;
  isRunning: boolean;
}

interface RegisteredJob {
  config: CronJobConfig;
  task: cron.ScheduledTask | null;
  runner: () => Promise<void>;
}

/**
 * Validates a basic 5-field cron expression.
 * Only checks that 5 whitespace-separated fields are present — does not validate
 * individual field ranges (e.g., 0-59 for minutes). Invalid field values will be
 * caught by node-cron when the expression is scheduled.
 */
export function isValidCronExpression(expression: string): boolean {
  if (!expression || typeof expression !== 'string') return false;
  const parts = expression.trim().split(/\s+/);
  return parts.length === 5;
}

class CronConfigServiceClass {
  private jobs: Map<string, RegisteredJob> = new Map();

  constructor() {
    // Pre-populate the 6 managed jobs with default config from env vars
    const defaults: Array<{ jobId: string; label: string; envVar?: string; defaultCron: string }> = [
      { jobId: 'stock_sync', label: 'Synchronizacja stanów magazynowych', envVar: 'SYMFONIA_SYNC_CRON_EXPRESSION', defaultCron: '0 * * * *' },
      { jobId: 'contracts_full', label: 'Pełna sync kontraktów', envVar: 'SYMFONIA_CONTRACTS_FULL_SYNC_CRON', defaultCron: '0 */3 * * *' },
      { jobId: 'contracts_quick', label: 'Szybka sync kontraktów', envVar: 'SYMFONIA_CONTRACTS_QUICK_SYNC_CRON', defaultCron: '30 * * * *' },
      { jobId: 'cars_sync', label: 'Synchronizacja samochodów', envVar: 'SYMFONIA_CARS_SYNC_CRON', defaultCron: '0 */12 * * *' },
      { jobId: 'warehouse_cleanup', label: 'Czyszczenie magazynu (stany 0)', defaultCron: '0 3 * * *' },
      { jobId: 'clean_drafts', label: 'Czyszczenie wygasłych draftów', defaultCron: '0 * * * *' },
    ];

    for (const d of defaults) {
      const cronExpression = (d.envVar && process.env[d.envVar]) ? process.env[d.envVar]! : d.defaultCron;
      this.jobs.set(d.jobId, {
        config: {
          jobId: d.jobId,
          label: d.label,
          cronExpression,
          enabled: true,
          lastRun: null,
          nextRun: null,
          isRunning: false,
        },
        task: null,
        runner: async () => {},
      });
    }
  }

  getAll(): CronJobConfig[] {
    return Array.from(this.jobs.values()).map(j => ({ ...j.config }));
  }

  getById(jobId: string): CronJobConfig | undefined {
    const job = this.jobs.get(jobId);
    return job ? { ...job.config } : undefined;
  }

  /**
   * Register a job with its runner function. Called from each job file.
   * If the job is already in the map (pre-populated), only the runner is updated.
   */
  registerJob(jobId: string, runner: () => Promise<void>, task?: cron.ScheduledTask | null): void {
    const existing = this.jobs.get(jobId);
    if (existing) {
      existing.runner = runner;
      if (task !== undefined) {
        existing.task = task;
      }
    }
  }

  /**
   * Update the task reference (called after the cron task is scheduled in the job file)
   */
  setTask(jobId: string, task: cron.ScheduledTask | null): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.task = task;
    }
  }

  /**
   * Mark a job as running / not running (called from job files)
   */
  setRunning(jobId: string, running: boolean): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.config.isRunning = running;
      if (running) {
        job.config.lastRun = new Date();
      }
    }
  }

  /**
   * Update the cron expression and enabled state for a job at runtime.
   * Stops the existing task and reschedules if enabled.
   */
  update(jobId: string, cronExpression: string, enabled: boolean): CronJobConfig {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' nie istnieje`);
    }
    if (!isValidCronExpression(cronExpression)) {
      throw new Error(`Nieprawidłowe wyrażenie cron: '${cronExpression}'. Wymagane 5 pól.`);
    }

    // Stop existing task
    if (job.task) {
      job.task.stop();
      job.task = null;
    }

    job.config.cronExpression = cronExpression;
    job.config.enabled = enabled;

    // Reschedule if enabled and runner has been registered
    if (enabled && job.runner) {
      const runner = job.runner;
      const jobRef = job;
      job.task = cron.schedule(cronExpression, async () => {
        jobRef.config.isRunning = true;
        jobRef.config.lastRun = new Date();
        try {
          await runner();
        } finally {
          jobRef.config.isRunning = false;
        }
      });
      console.log(`🔄 [CronConfig] Job '${jobId}' przelplanowany: ${cronExpression}`);
    } else if (!enabled) {
      console.log(`⏸️  [CronConfig] Job '${jobId}' wyłączony`);
    }

    return { ...job.config };
  }

  /**
   * Immediately execute a job's runner function outside of the schedule.
   */
  async triggerNow(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' nie istnieje`);
    }
    if (job.config.isRunning) {
      throw new Error(`Job '${jobId}' jest już uruchomiony`);
    }
    if (!job.runner) {
      throw new Error(`Job '${jobId}' nie ma zarejestrowanego runnera`);
    }

    job.config.isRunning = true;
    job.config.lastRun = new Date();
    try {
      await job.runner();
    } finally {
      job.config.isRunning = false;
    }
  }

  /**
   * Stop all managed tasks — called during graceful shutdown.
   */
  stopAll(): void {
    for (const [jobId, job] of this.jobs) {
      if (job.task) {
        job.task.stop();
        job.task = null;
        console.log(`⏹️  [CronConfig] Job '${jobId}' zatrzymany`);
      }
    }
  }
}

// Singleton export
export const CronConfigService = new CronConfigServiceClass();

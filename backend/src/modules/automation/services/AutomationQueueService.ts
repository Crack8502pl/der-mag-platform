// src/modules/automation/services/AutomationQueueService.ts
// Kolejka Bull "automation" (wzór: EmailQueueService). Bez Redisa moduł pracuje synchronicznie.

import Bull, { Job, Queue } from 'bull';
import Redis from 'ioredis';
import { emailConfig } from '../../../config/email';
import { serverLogger } from '../../../utils/logger';
import { MAX_STEP_ATTEMPTS, STEP_BACKOFF_MS } from '../contracts';
import type { AutomationExecutionService, AutomationQueue } from './AutomationExecutionService';

interface StepJob {
  runId: number;
  stepIndex: number;
}

const ENQUEUE_TIMEOUT_MS = 3000;
const REDIS_PROBE_TIMEOUT_MS = 2000;

async function redisAvailable(): Promise<boolean> {
  const client = new Redis({
    ...emailConfig.redis,
    lazyConnect: true,
    connectTimeout: REDIS_PROBE_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  client.on('error', () => undefined);
  try {
    await client.connect();
    await client.ping();
    return true;
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}

export class AutomationQueueService implements AutomationQueue {
  private queue: Queue<StepJob> | null = null;

  isReady(): boolean {
    return this.queue !== null;
  }

  async initialize(executor: AutomationExecutionService): Promise<void> {
    if (this.queue) return;
    if (!(await redisAvailable())) {
      serverLogger.warn('⚠️  Redis niedostępny – automatyzacje będą wykonywane synchronicznie po zatwierdzeniu transakcji');
      return;
    }
    const queue = new Bull<StepJob>('automation', {
      redis: emailConfig.redis,
      settings: {
        backoffStrategies: {
          automation: attemptsMade => STEP_BACKOFF_MS[Math.min(Math.max(attemptsMade, 1), STEP_BACKOFF_MS.length) - 1],
        },
      },
      defaultJobOptions: {
        attempts: MAX_STEP_ATTEMPTS,
        backoff: { type: 'automation' },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    });
    queue.on('error', error => serverLogger.error('❌ Błąd kolejki automatyzacji:', error));
    queue.process(async (job: Job<StepJob>) => {
      const { runId, stepIndex } = job.data;
      const outcome = await executor.executeStep(runId, stepIndex);
      if (outcome.next === 'RETRY') throw new Error(outcome.message);
      if (outcome.next === 'NEXT') {
        const queued = await this.enqueue({ runId, stepIndex: stepIndex + 1 }).catch(() => false);
        if (!queued) await executor.executeRun(runId, stepIndex + 1);
      }
    });
    this.queue = queue;
    serverLogger.info('✅ Kolejka automatyzacji zainicjalizowana');
  }

  async enqueue(job: StepJob, delayMs = 0): Promise<boolean> {
    if (!this.queue) return false;
    const added = this.queue.add(job, { delay: delayMs, jobId: `run-${job.runId}-step-${job.stepIndex}` });
    const timeout = new Promise<null>(resolve => { setTimeout(() => resolve(null), ENQUEUE_TIMEOUT_MS).unref(); });
    return (await Promise.race([added, timeout])) !== null;
  }

  async close(): Promise<void> {
    if (!this.queue) return;
    await this.queue.close();
    this.queue = null;
  }
}

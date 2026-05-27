// tests/unit/services/CronConfigService.test.ts
// Unit tests for CronConfigService

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    stop: jest.fn(),
  })),
}));

// Re-import after mock setup — use jest.isolateModules to get a fresh singleton each test
let CronConfigService: any;
let isValidCronExpression: any;
let nodeCronMock: { schedule: jest.Mock };

beforeEach(() => {
  jest.resetModules();

  // Re-require the service so each test gets a fresh singleton
  const mod = require('../../../src/services/CronConfigService');
  CronConfigService = mod.CronConfigService;
  isValidCronExpression = mod.isValidCronExpression;

  // Re-require node-cron to get the fresh mock created for this module cycle
  nodeCronMock = require('node-cron');
  (nodeCronMock.schedule as jest.Mock).mockReturnValue({ stop: jest.fn() });
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── isValidCronExpression ────────────────────────────────────────────────────

describe('isValidCronExpression', () => {
  it('returns true for a valid 5-field expression', () => {
    expect(isValidCronExpression('0 * * * *')).toBe(true);
    expect(isValidCronExpression('*/30 * * * *')).toBe(true);
    expect(isValidCronExpression('0 3 * * *')).toBe(true);
    expect(isValidCronExpression('0 */12 * * *')).toBe(true);
  });

  it('returns false for expressions with wrong number of fields', () => {
    expect(isValidCronExpression('* * * *')).toBe(false);   // 4 fields
    expect(isValidCronExpression('* * * * * *')).toBe(false); // 6 fields
    expect(isValidCronExpression('')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isValidCronExpression(null as any)).toBe(false);
    expect(isValidCronExpression(undefined as any)).toBe(false);
  });
});

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('CronConfigService.getAll()', () => {
  it('returns all 6 pre-populated jobs', () => {
    const jobs = CronConfigService.getAll();
    expect(jobs).toHaveLength(6);
    const ids = jobs.map((j: any) => j.jobId);
    expect(ids).toContain('stock_sync');
    expect(ids).toContain('contracts_full');
    expect(ids).toContain('contracts_quick');
    expect(ids).toContain('cars_sync');
    expect(ids).toContain('warehouse_cleanup');
    expect(ids).toContain('clean_drafts');
  });

  it('returns copies — mutations do not affect internal state', () => {
    const jobs = CronConfigService.getAll();
    jobs[0].label = 'MUTATED';
    const jobs2 = CronConfigService.getAll();
    expect(jobs2[0].label).not.toBe('MUTATED');
  });

  it('all jobs have required fields', () => {
    const jobs = CronConfigService.getAll();
    for (const job of jobs) {
      expect(typeof job.jobId).toBe('string');
      expect(typeof job.label).toBe('string');
      expect(typeof job.cronExpression).toBe('string');
      expect(typeof job.enabled).toBe('boolean');
      expect(typeof job.isRunning).toBe('boolean');
    }
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe('CronConfigService.getById()', () => {
  it('returns the correct job config', () => {
    const job = CronConfigService.getById('stock_sync');
    expect(job).toBeDefined();
    expect(job.jobId).toBe('stock_sync');
    expect(job.label).toBe('Synchronizacja stanów magazynowych');
  });

  it('returns undefined for unknown jobId', () => {
    expect(CronConfigService.getById('nonexistent')).toBeUndefined();
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('CronConfigService.update()', () => {
  it('returns the updated config with new cronExpression', () => {
    const updated = CronConfigService.update('stock_sync', '0 */2 * * *', true);
    expect(updated.cronExpression).toBe('0 */2 * * *');
    expect(updated.enabled).toBe(true);
  });

  it('reflects the change in getById after update', () => {
    CronConfigService.update('contracts_full', '0 */6 * * *', true);
    const job = CronConfigService.getById('contracts_full');
    expect(job.cronExpression).toBe('0 */6 * * *');
  });

  it('schedules a new cron task when enabled is true', () => {
    // Register a dummy runner first so that schedule is called
    CronConfigService.registerJob('stock_sync', async () => {});
    CronConfigService.update('stock_sync', '0 */4 * * *', true);
    expect(nodeCronMock.schedule).toHaveBeenCalledWith('0 */4 * * *', expect.any(Function));
  });

  it('does not schedule a task when enabled is false', () => {
    (nodeCronMock.schedule as jest.Mock).mockClear();
    CronConfigService.registerJob('cars_sync', async () => {});
    CronConfigService.update('cars_sync', '0 */6 * * *', false);
    expect(nodeCronMock.schedule).not.toHaveBeenCalled();
  });

  it('throws for an invalid cron expression', () => {
    expect(() => CronConfigService.update('stock_sync', 'invalid', true)).toThrow(
      'Nieprawidłowe wyrażenie cron'
    );
  });

  it('throws for a non-existent jobId', () => {
    expect(() => CronConfigService.update('does_not_exist', '0 * * * *', true)).toThrow(
      "Job 'does_not_exist' nie istnieje"
    );
  });

  it('stops the old task before rescheduling', () => {
    const mockStop = jest.fn();
    const mockTask = { stop: mockStop };
    (nodeCronMock.schedule as jest.Mock).mockReturnValueOnce(mockTask);

    CronConfigService.registerJob('clean_drafts', async () => {});
    // First update creates a task
    CronConfigService.update('clean_drafts', '0 */2 * * *', true);
    // Second update should stop the first task
    (nodeCronMock.schedule as jest.Mock).mockReturnValueOnce({ stop: jest.fn() });
    CronConfigService.update('clean_drafts', '0 */4 * * *', true);

    expect(mockStop).toHaveBeenCalledTimes(1);
  });
});

// ─── triggerNow ───────────────────────────────────────────────────────────────

describe('CronConfigService.triggerNow()', () => {
  it('calls the registered runner immediately', async () => {
    const runner = jest.fn().mockResolvedValue(undefined);
    CronConfigService.registerJob('warehouse_cleanup', runner);
    await CronConfigService.triggerNow('warehouse_cleanup');
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('throws for a non-existent jobId', async () => {
    await expect(CronConfigService.triggerNow('nonexistent')).rejects.toThrow(
      "Job 'nonexistent' nie istnieje"
    );
  });

  it('throws when the job is already running', async () => {
    const slowRunner = jest.fn(() => new Promise(resolve => setTimeout(resolve, 5000)));
    CronConfigService.registerJob('stock_sync', slowRunner);

    // Start without awaiting
    CronConfigService.triggerNow('stock_sync').catch(() => {});
    // Immediately try again — should throw
    await expect(CronConfigService.triggerNow('stock_sync')).rejects.toThrow(
      'jest już uruchomiony'
    );
  });

  it('resets isRunning to false after completion', async () => {
    const runner = jest.fn().mockResolvedValue(undefined);
    CronConfigService.registerJob('clean_drafts', runner);
    await CronConfigService.triggerNow('clean_drafts');
    const job = CronConfigService.getById('clean_drafts');
    expect(job.isRunning).toBe(false);
  });
});

// ─── setRunning / setTask ────────────────────────────────────────────────────

describe('CronConfigService.setRunning()', () => {
  it('marks a job as running', () => {
    CronConfigService.setRunning('stock_sync', true);
    expect(CronConfigService.getById('stock_sync')!.isRunning).toBe(true);
  });

  it('marks a job as not running', () => {
    CronConfigService.setRunning('stock_sync', true);
    CronConfigService.setRunning('stock_sync', false);
    expect(CronConfigService.getById('stock_sync')!.isRunning).toBe(false);
  });
});

// ─── stopAll ─────────────────────────────────────────────────────────────────

describe('CronConfigService.stopAll()', () => {
  it('stops all active tasks', () => {
    const mockStop1 = jest.fn();
    const mockStop2 = jest.fn();
    (nodeCronMock.schedule as jest.Mock)
      .mockReturnValueOnce({ stop: mockStop1 })
      .mockReturnValueOnce({ stop: mockStop2 });

    CronConfigService.registerJob('stock_sync', async () => {});
    CronConfigService.registerJob('cars_sync', async () => {});
    CronConfigService.update('stock_sync', '0 * * * *', true);
    CronConfigService.update('cars_sync', '0 */12 * * *', true);

    CronConfigService.stopAll();

    expect(mockStop1).toHaveBeenCalledTimes(1);
    expect(mockStop2).toHaveBeenCalledTimes(1);
  });
});


// ─── isValidCronExpression ────────────────────────────────────────────────────

describe('isValidCronExpression', () => {
  it('returns true for a valid 5-field expression', () => {
    expect(isValidCronExpression('0 * * * *')).toBe(true);
    expect(isValidCronExpression('*/30 * * * *')).toBe(true);
    expect(isValidCronExpression('0 3 * * *')).toBe(true);
    expect(isValidCronExpression('0 */12 * * *')).toBe(true);
  });

  it('returns false for expressions with wrong number of fields', () => {
    expect(isValidCronExpression('* * * *')).toBe(false);   // 4 fields
    expect(isValidCronExpression('* * * * * *')).toBe(false); // 6 fields
    expect(isValidCronExpression('')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isValidCronExpression(null as any)).toBe(false);
    expect(isValidCronExpression(undefined as any)).toBe(false);
  });
});

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('CronConfigService.getAll()', () => {
  it('returns all 6 pre-populated jobs', () => {
    const jobs = CronConfigService.getAll();
    expect(jobs).toHaveLength(6);
    const ids = jobs.map((j: any) => j.jobId);
    expect(ids).toContain('stock_sync');
    expect(ids).toContain('contracts_full');
    expect(ids).toContain('contracts_quick');
    expect(ids).toContain('cars_sync');
    expect(ids).toContain('warehouse_cleanup');
    expect(ids).toContain('clean_drafts');
  });

  it('returns copies — mutations do not affect internal state', () => {
    const jobs = CronConfigService.getAll();
    jobs[0].label = 'MUTATED';
    const jobs2 = CronConfigService.getAll();
    expect(jobs2[0].label).not.toBe('MUTATED');
  });

  it('all jobs have required fields', () => {
    const jobs = CronConfigService.getAll();
    for (const job of jobs) {
      expect(typeof job.jobId).toBe('string');
      expect(typeof job.label).toBe('string');
      expect(typeof job.cronExpression).toBe('string');
      expect(typeof job.enabled).toBe('boolean');
      expect(typeof job.isRunning).toBe('boolean');
    }
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe('CronConfigService.getById()', () => {
  it('returns the correct job config', () => {
    const job = CronConfigService.getById('stock_sync');
    expect(job).toBeDefined();
    expect(job.jobId).toBe('stock_sync');
    expect(job.label).toBe('Synchronizacja stanów magazynowych');
  });

  it('returns undefined for unknown jobId', () => {
    expect(CronConfigService.getById('nonexistent')).toBeUndefined();
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('CronConfigService.update()', () => {
  it('returns the updated config with new cronExpression', () => {
    const updated = CronConfigService.update('stock_sync', '0 */2 * * *', true);
    expect(updated.cronExpression).toBe('0 */2 * * *');
    expect(updated.enabled).toBe(true);
  });

  it('reflects the change in getById after update', () => {
    CronConfigService.update('contracts_full', '0 */6 * * *', true);
    const job = CronConfigService.getById('contracts_full');
    expect(job.cronExpression).toBe('0 */6 * * *');
  });

  it('schedules a new cron task when enabled is true', () => {
    // Register a dummy runner first so that schedule is called
    CronConfigService.registerJob('stock_sync', async () => {});
    CronConfigService.update('stock_sync', '0 */4 * * *', true);
    expect(nodeCronMock.schedule).toHaveBeenCalledWith('0 */4 * * *', expect.any(Function));
  });

  it('does not schedule a task when enabled is false', () => {
    (nodeCronMock.schedule as jest.Mock).mockClear();
    CronConfigService.registerJob('cars_sync', async () => {});
    CronConfigService.update('cars_sync', '0 */6 * * *', false);
    expect(nodeCronMock.schedule).not.toHaveBeenCalled();
  });

  it('throws for an invalid cron expression', () => {
    expect(() => CronConfigService.update('stock_sync', 'invalid', true)).toThrow(
      'Nieprawidłowe wyrażenie cron'
    );
  });

  it('throws for a non-existent jobId', () => {
    expect(() => CronConfigService.update('does_not_exist', '0 * * * *', true)).toThrow(
      "Job 'does_not_exist' nie istnieje"
    );
  });

  it('stops the old task before rescheduling', () => {
    const mockStop = jest.fn();
    const mockTask = { stop: mockStop };
    (nodeCronMock.schedule as jest.Mock).mockReturnValueOnce(mockTask);

    CronConfigService.registerJob('clean_drafts', async () => {});
    // First update creates a task
    CronConfigService.update('clean_drafts', '0 */2 * * *', true);
    // Second update should stop the first task
    (nodeCronMock.schedule as jest.Mock).mockReturnValueOnce({ stop: jest.fn() });
    CronConfigService.update('clean_drafts', '0 */4 * * *', true);

    expect(mockStop).toHaveBeenCalledTimes(1);
  });
});

// ─── triggerNow ───────────────────────────────────────────────────────────────

describe('CronConfigService.triggerNow()', () => {
  it('calls the registered runner immediately', async () => {
    const runner = jest.fn().mockResolvedValue(undefined);
    CronConfigService.registerJob('warehouse_cleanup', runner);
    await CronConfigService.triggerNow('warehouse_cleanup');
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('throws for a non-existent jobId', async () => {
    await expect(CronConfigService.triggerNow('nonexistent')).rejects.toThrow(
      "Job 'nonexistent' nie istnieje"
    );
  });

  it('throws when the job is already running', async () => {
    const slowRunner = jest.fn(() => new Promise(resolve => setTimeout(resolve, 5000)));
    CronConfigService.registerJob('stock_sync', slowRunner);

    // Start without awaiting
    CronConfigService.triggerNow('stock_sync').catch(() => {});
    // Immediately try again — should throw
    await expect(CronConfigService.triggerNow('stock_sync')).rejects.toThrow(
      'jest już uruchomiony'
    );
  });

  it('resets isRunning to false after completion', async () => {
    const runner = jest.fn().mockResolvedValue(undefined);
    CronConfigService.registerJob('clean_drafts', runner);
    await CronConfigService.triggerNow('clean_drafts');
    const job = CronConfigService.getById('clean_drafts');
    expect(job.isRunning).toBe(false);
  });
});

// ─── setRunning / setTask ────────────────────────────────────────────────────

describe('CronConfigService.setRunning()', () => {
  it('marks a job as running', () => {
    CronConfigService.setRunning('stock_sync', true);
    expect(CronConfigService.getById('stock_sync')!.isRunning).toBe(true);
  });

  it('marks a job as not running', () => {
    CronConfigService.setRunning('stock_sync', true);
    CronConfigService.setRunning('stock_sync', false);
    expect(CronConfigService.getById('stock_sync')!.isRunning).toBe(false);
  });
});

// ─── stopAll ─────────────────────────────────────────────────────────────────

describe('CronConfigService.stopAll()', () => {
  it('stops all active tasks', () => {
    const mockStop1 = jest.fn();
    const mockStop2 = jest.fn();
    (nodeCronMock.schedule as jest.Mock)
      .mockReturnValueOnce({ stop: mockStop1 })
      .mockReturnValueOnce({ stop: mockStop2 });

    CronConfigService.registerJob('stock_sync', async () => {});
    CronConfigService.registerJob('cars_sync', async () => {});
    CronConfigService.update('stock_sync', '0 * * * *', true);
    CronConfigService.update('cars_sync', '0 */12 * * *', true);

    CronConfigService.stopAll();

    expect(mockStop1).toHaveBeenCalledTimes(1);
    expect(mockStop2).toHaveBeenCalledTimes(1);
  });
});

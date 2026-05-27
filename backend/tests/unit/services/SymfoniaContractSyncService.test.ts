import { SymfoniaContractSyncService } from '../../../src/services/SymfoniaContractSyncService';

describe('SymfoniaContractSyncService - cron lock handling', () => {
  const STALE_LOCK_TIME_MS = 91 * 60 * 1000;

  beforeEach(() => {
    jest.restoreAllMocks();
    SymfoniaContractSyncService.resetSyncLock();
  });

  it('should reset stale lock and continue fullSyncFromCron', async () => {
    const service = SymfoniaContractSyncService as any;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    service.isContractSyncRunning = true;
    service.contractSyncStartedAt = new Date(Date.now() - STALE_LOCK_TIME_MS);

    jest.spyOn(service, 'fetchSymfoniaContractData').mockResolvedValue([]);
    jest.spyOn(service, 'upsertContracts').mockResolvedValue({ created: 0, updated: 0, skipped: 0, errors: 0 });
    jest.spyOn(service, 'logSync').mockResolvedValue(undefined);

    const result = await SymfoniaContractSyncService.fullSyncFromCron();

    expect(result.success).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      '⚠️  [CRON] Resetuję blokadę synchronizacji kontraktów (przekroczono 90 min)'
    );
    expect(service.isContractSyncRunning).toBe(false);
    expect(service.contractSyncStartedAt).toBeNull();
  });

  it('should throw when lock is active and not stale', async () => {
    const service = SymfoniaContractSyncService as any;
    service.isContractSyncRunning = true;
    service.contractSyncStartedAt = new Date();

    await expect(SymfoniaContractSyncService.fullSyncFromCron()).rejects.toThrow(
      'Synchronizacja kontraktów jest już uruchomiona'
    );
  });

  it('should reset stale lock and continue quickSync', async () => {
    const service = SymfoniaContractSyncService as any;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    service.isContractSyncRunning = true;
    service.contractSyncStartedAt = new Date(Date.now() - STALE_LOCK_TIME_MS);

    jest.spyOn(service, 'fetchSymfoniaContractData').mockResolvedValue([]);
    jest.spyOn(service, 'updateStatusesOnly').mockResolvedValue({ updated: 0, skipped: 0, errors: 0 });
    jest.spyOn(service, 'logSync').mockResolvedValue(undefined);

    const result = await SymfoniaContractSyncService.quickSync();

    expect(result.success).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      '⚠️  [CRON] Resetuję blokadę synchronizacji kontraktów (przekroczono 90 min)'
    );
    expect(service.isContractSyncRunning).toBe(false);
    expect(service.contractSyncStartedAt).toBeNull();
  });

  it('should throw when lock is active and not stale for quickSync', async () => {
    const service = SymfoniaContractSyncService as any;
    service.isContractSyncRunning = true;
    service.contractSyncStartedAt = new Date();

    await expect(SymfoniaContractSyncService.quickSync()).rejects.toThrow(
      'Synchronizacja kontraktów jest już uruchomiona'
    );
  });
});

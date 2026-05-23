import { SymfoniaContractSyncService } from '../../../src/services/SymfoniaContractSyncService';

describe('SymfoniaContractSyncService - cron lock handling', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    SymfoniaContractSyncService.resetSyncLock();
  });

  it('should reset stale lock and continue fullSyncFromCron', async () => {
    const service = SymfoniaContractSyncService as any;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    service.isContractSyncRunning = true;
    service.contractSyncStartedAt = new Date(Date.now() - (91 * 60 * 1000));

    jest.spyOn(service, 'fetchSymfoniaContractData').mockResolvedValue([]);
    jest.spyOn(service, 'upsertContracts').mockResolvedValue({ created: 0, updated: 0, skipped: 0, errors: 0 });
    jest.spyOn(service, 'logSync').mockResolvedValue(undefined);

    const result = await SymfoniaContractSyncService.fullSyncFromCron();

    expect(result.success).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Resetuję blokadę synchronizacji kontraktów'));
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
});

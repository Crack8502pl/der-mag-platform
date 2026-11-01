import { domainEventBus, DomainEventBus, type DomainEvent } from '../../../../src/modules/events/DomainEventBus';
import { AutomationRegistry } from '../../../../src/modules/automation/registry/AutomationRegistry';
import { AutomationExecutionService } from '../../../../src/modules/automation/services/AutomationExecutionService';
import { MASK } from '../../../../src/modules/automation/masking';
import { fakeAction, InMemoryAutomationStore, ok } from './helpers';

jest.mock('../../../../src/config/database', () => ({ AppDataSource: { getRepository: jest.fn(), manager: {} } }));
jest.mock('../../../../src/utils/logger', () => ({ serverLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));

function approvedEvent(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    id: 'evt-1',
    type: 'FORM_APPROVED',
    occurredAt: new Date('2026-11-02T10:00:00Z'),
    actorId: 7,
    subject: { type: 'FORM_INSTANCE', id: 100 },
    payload: { instanceId: 100, templateVersionId: 5, taskId: 42, contractId: 3 },
    causationDepth: 0,
    ...overrides,
  };
}

function setup(actions: Parameters<typeof fakeAction>[]) {
  const registry = new AutomationRegistry();
  for (const [key, run, overrides] of actions) registry.register(fakeAction(key, run, overrides));
  const store = new InMemoryAutomationStore();
  const service = new AutomationExecutionService({ registry, store, render: async text => text.replace('{task.number}', 'Z00000042'), findInstanceId: async () => 100 });
  return { store, service };
}

describe('AutomationExecutionService', () => {
  it('zdarzenie FORM_APPROVED uruchamia łańcuch dokładnie raz, także przy ponownym dostarczeniu', async () => {
    const first = jest.fn(async () => ok());
    const { store, service } = setup([['one', first]]);
    store.addChain({ steps: [{ action: 'one', params: {} }] });

    await service.handleEvent(approvedEvent());
    await service.handleEvent(approvedEvent());

    expect(first).toHaveBeenCalledTimes(1);
    expect(store.runs).toHaveLength(1);
    expect(store.runs[0]).toMatchObject({ status: 'SUCCEEDED', dryRun: false, chainAuthorId: 11, actorId: 7, causationDepth: 0 });
    expect(store.steps[0]).toMatchObject({ status: 'SUCCEEDED', attempt: 1, idempotencyKey: `${store.runs[0].id}:0` });
  });

  it('nie uruchamia łańcuchów innego właściciela ani innego zdarzenia', async () => {
    const run = jest.fn(async () => ok());
    const { store, service } = setup([['one', run]]);
    store.addChain({ ownerId: 6, steps: [{ action: 'one', params: {} }] });
    store.addChain({ eventType: 'FORM_REJECTED', steps: [{ action: 'one', params: {} }] });

    await service.handleEvent(approvedEvent());
    expect(run).not.toHaveBeenCalled();
  });

  it('ponowienie po błędzie kroku 2 nie powtarza kroku 1 (idempotencja)', async () => {
    const step1 = jest.fn(async () => ok('krok 1'));
    let calls = 0;
    const step2 = jest.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error('chwilowy błąd');
      return ok('krok 2');
    });
    const { store, service } = setup([['one', step1], ['two', step2]]);
    const chain = store.addChain({ steps: [{ action: 'one', params: {} }, { action: 'two', params: {} }] });
    const created = (await store.createRun({
      chainId: chain.id, eventId: 'e', event: {}, status: 'RUNNING', dryRun: false, causationDepth: 0, chainAuthorId: 11, actorId: 7,
    }, chain.steps.map((s, i) => ({ stepIndex: i, action: s.action, input: {} }))))!;

    expect((await service.executeStep(created.run.id, 0)).next).toBe('NEXT');
    const failed = await service.executeStep(created.run.id, 1);
    expect(failed).toMatchObject({ next: 'RETRY', delayMs: 60_000 });
    expect(store.steps[1]).toMatchObject({ status: 'RETRY', attempt: 1 });

    // Ponowne wykonanie całego runa (np. redelivery) – krok 1 jest już SUCCEEDED i nie jest powtarzany.
    await service.executeRun(created.run.id);

    expect(step1).toHaveBeenCalledTimes(1);
    expect(step2).toHaveBeenCalledTimes(2);
    expect(store.steps.map(s => s.status)).toEqual(['SUCCEEDED', 'SUCCEEDED']);
    expect(store.steps[1].attempt).toBe(2);
    expect(store.runs[0].status).toBe('SUCCEEDED');
  });

  it('po 3 nieudanych próbach krok = FAILED, kolejne pominięte, run FAILED/PARTIAL; backoff 1 min, 5 min', async () => {
    const good = jest.fn(async () => ok());
    const bad = jest.fn(async () => ({ status: 'FAILED' as const, message: 'Błąd', output: {} }));
    const never = jest.fn(async () => ok());
    const { store, service } = setup([['good', good], ['bad', bad], ['never', never]]);
    const chain = store.addChain({ onError: 'STOP', steps: [{ action: 'good', params: {} }, { action: 'bad', params: {} }, { action: 'never', params: {} }] });
    const created = (await store.createRun({
      chainId: chain.id, eventId: 'e2', event: {}, status: 'RUNNING', dryRun: false, causationDepth: 0, chainAuthorId: 11, actorId: 7,
    }, chain.steps.map((s, i) => ({ stepIndex: i, action: s.action, input: {} }))))!;

    await service.executeStep(created.run.id, 0);
    expect(await service.executeStep(created.run.id, 1)).toMatchObject({ next: 'RETRY', delayMs: 60_000 });
    expect(await service.executeStep(created.run.id, 1)).toMatchObject({ next: 'RETRY', delayMs: 300_000 });
    expect(await service.executeStep(created.run.id, 1)).toEqual({ next: 'FINISHED' });

    expect(bad).toHaveBeenCalledTimes(3);
    expect(never).not.toHaveBeenCalled();
    expect(store.steps.map(s => s.status)).toEqual(['SUCCEEDED', 'FAILED', 'SKIPPED']);
    expect(store.runs[0].status).toBe('PARTIAL');
  });

  it('onError CONTINUE wykonuje kolejne kroki po błędzie', async () => {
    const bad = jest.fn(async () => { throw new Error('x'); });
    const after = jest.fn(async () => ok());
    const { store, service } = setup([['bad', bad], ['after', after]]);
    store.addChain({ onError: 'CONTINUE', steps: [{ action: 'bad', params: {} }, { action: 'after', params: {} }] });

    await service.handleEvent(approvedEvent({ id: 'evt-c' }));

    expect(bad).toHaveBeenCalledTimes(3);
    expect(after).toHaveBeenCalledTimes(1);
    expect(store.runs[0].status).toBe('PARTIAL');
  });

  it('pętla zatrzymana przy głębokości 4 (BLOCKED z komunikatem PL), głębokość 3 jest dozwolona', async () => {
    const run = jest.fn(async () => ok());
    const { store, service } = setup([['one', run]]);
    store.addChain({ steps: [{ action: 'one', params: {} }] });

    await service.handleEvent(approvedEvent({ id: 'evt-d3', causationDepth: 3 }));
    expect(run).toHaveBeenCalledTimes(1);
    expect(store.runs[0].status).toBe('SUCCEEDED');

    await service.handleEvent(approvedEvent({ id: 'evt-d4', causationDepth: 4 }));
    expect(run).toHaveBeenCalledTimes(1);
    expect(store.runs[1]).toMatchObject({ status: 'BLOCKED', causationDepth: 4 });
    expect(store.runs[1].message).toMatch(/Zablokowano.*pętla/);
    expect(store.steps.filter(s => s.runId === store.runs[1].id)).toHaveLength(0);
  });

  it('zdarzenie publikowane przez klocek dostaje causationDepth + 1 i w końcu zostaje zablokowane', async () => {
    const bus = new DomainEventBus();
    const registry = new AutomationRegistry().register(fakeAction('loop', async () => {
      await bus.publish({ type: 'FORM_APPROVED', subject: { type: 'FORM_INSTANCE', id: 100 }, payload: approvedEvent().payload });
      return ok();
    }));
    const store = new InMemoryAutomationStore();
    store.addChain({ steps: [{ action: 'loop', params: {} }] });
    const service = new AutomationExecutionService({ registry, store, render: async text => text });
    bus.subscribe('FORM_APPROVED', event => service.handleEvent(event));

    await bus.publish({ type: 'FORM_APPROVED', actorId: 7, subject: { type: 'FORM_INSTANCE', id: 100 }, payload: approvedEvent().payload });

    expect(store.runs.map(r => [r.causationDepth, r.status])).toEqual([
      [0, 'SUCCEEDED'], [1, 'SUCCEEDED'], [2, 'SUCCEEDED'], [3, 'SUCCEEDED'], [4, 'BLOCKED'],
    ]);
  });

  it('tryb testowy: dryRun, zapis runa z dry_run = true i wynik każdego kroku', async () => {
    const seen: boolean[] = [];
    const { store, service } = setup([['one', async (_ctx, _params, { dryRun }) => { seen.push(dryRun); return ok('Tryb testowy'); }]]);
    const chain = store.addChain({ steps: [{ action: 'one', params: { text: 'Zadanie {task.number}' } }] });

    const result = await service.runTest(chain, 42, 9);

    expect(seen).toEqual([true]);
    expect(result.run).toMatchObject({ dryRun: true, status: 'SUCCEEDED', actorId: 9, chainAuthorId: 11 });
    expect(result.steps[0]).toMatchObject({ status: 'SUCCEEDED', message: 'Tryb testowy', input: { text: 'Zadanie Z00000042' } });
  });

  it('w trybie testowym błąd kroku nie jest ponawiany', async () => {
    const bad = jest.fn(async () => ({ status: 'FAILED' as const, message: 'Błąd', output: {} }));
    const { store, service } = setup([['bad', bad]]);
    const chain = store.addChain({ steps: [{ action: 'bad', params: {} }] });

    const result = await service.runTest(chain, 42, 9);

    expect(bad).toHaveBeenCalledTimes(1);
    expect(result.run.status).toBe('FAILED');
  });

  it('hasła i tokeny w input oraz w zdarzeniu są zamaskowane w dzienniku', async () => {
    const { store, service } = setup([['one', async () => ({ status: 'OK' as const, message: 'ok', output: { apiToken: 'abc' } })]]);
    store.addChain({
      steps: [{ action: 'one', params: { text: 'hasło: x', password: 'SuperTajne', token: 'tok-123', nested: { secret: 's' } } }],
    });

    await service.handleEvent(approvedEvent({ id: 'evt-m', payload: { ...approvedEvent().payload, password: 'P@ss', authToken: 'zzz' } }));

    const serialized = JSON.stringify({ run: store.runs, steps: store.steps });
    for (const secret of ['SuperTajne', 'tok-123', 'P@ss', 'zzz', '"abc"']) expect(serialized).not.toContain(secret);
    expect(store.steps[0].input).toMatchObject({ password: MASK, token: MASK, nested: { secret: MASK } });
    expect(store.steps[0].output).toEqual({ apiToken: MASK });
    expect(store.runs[0].event).toMatchObject({ payload: { password: MASK, authToken: MASK } });
  });

  it('używa kolejki, gdy jest dostępna, a bez niej wykonuje synchronicznie', async () => {
    const run = jest.fn(async () => ok());
    const registry = new AutomationRegistry().register(fakeAction('one', run));
    const store = new InMemoryAutomationStore();
    store.addChain({ steps: [{ action: 'one', params: {} }] });
    const enqueue = jest.fn(async () => true);
    const service = new AutomationExecutionService({ registry, store, render: async t => t, getQueue: () => ({ enqueue }) });

    await service.handleEvent(approvedEvent({ id: 'evt-q' }));
    expect(enqueue).toHaveBeenCalledWith({ runId: store.runs[0].id, stepIndex: 0 });
    expect(run).not.toHaveBeenCalled();

    enqueue.mockResolvedValueOnce(false);
    await service.handleEvent(approvedEvent({ id: 'evt-q2' }));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('wspólna magistrala jest współdzielona (singleton)', () => {
    expect(domainEventBus).toBeInstanceOf(DomainEventBus);
  });
});

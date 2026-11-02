import { DomainEventBus, causationContext } from '../../../../src/modules/events/DomainEventBus';

jest.mock('../../../../src/utils/logger', () => ({ serverLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));

describe('DomainEventBus', () => {
  it('przekazuje zdarzenie z domyślną głębokością 0 do subskrybentów danego typu', async () => {
    const bus = new DomainEventBus();
    const handler = jest.fn();
    const other = jest.fn();
    bus.subscribe('FORM_APPROVED', handler);
    bus.subscribe('FORM_REJECTED', other);

    await bus.publish({ type: 'FORM_APPROVED', actorId: 3, subject: { type: 'FORM_INSTANCE', id: 9 }, payload: { a: 1 } });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      type: 'FORM_APPROVED', actorId: 3, subject: { type: 'FORM_INSTANCE', id: 9 }, payload: { a: 1 }, causationDepth: 0,
    });
    expect(handler.mock.calls[0][0].occurredAt).toBeInstanceOf(Date);
    expect(other).not.toHaveBeenCalled();
  });

  it('błąd subskrybenta nie przerywa publikacji ani innych subskrybentów', async () => {
    const bus = new DomainEventBus();
    const good = jest.fn();
    bus.subscribe('FORM_SUBMITTED', () => { throw new Error('boom'); });
    bus.subscribe('FORM_SUBMITTED', good);

    await expect(bus.publish({ type: 'FORM_SUBMITTED', subject: { type: 'FORM_INSTANCE', id: 1 } })).resolves.toBeDefined();
    expect(good).toHaveBeenCalledTimes(1);
  });

  it('afterCommit publikuje dopiero po zatwierdzeniu transakcji', async () => {
    const bus = new DomainEventBus();
    const order: string[] = [];
    bus.subscribe('FORM_APPROVED', () => { order.push('handler'); });
    const dataSource = {
      transaction: jest.fn(async (work: (manager: unknown) => Promise<unknown>) => {
        const result = await work({});
        order.push('commit');
        return result;
      }),
    };

    const result = await bus.afterCommit(dataSource as never, async (_manager, emit) => {
      order.push('work');
      emit({ type: 'FORM_APPROVED', subject: { type: 'FORM_INSTANCE', id: 1 } });
      return 'done';
    });

    expect(result).toBe('done');
    expect(order).toEqual(['work', 'commit', 'handler']);
  });

  it('afterCommit nie publikuje zdarzeń po wycofaniu transakcji', async () => {
    const bus = new DomainEventBus();
    const handler = jest.fn();
    bus.subscribe('FORM_APPROVED', handler);
    const dataSource = { transaction: jest.fn(async (work: (manager: unknown) => Promise<unknown>) => work({})) };

    await expect(bus.afterCommit(dataSource as never, async (_manager, emit) => {
      emit({ type: 'FORM_APPROVED', subject: { type: 'FORM_INSTANCE', id: 1 } });
      throw new Error('rollback');
    })).rejects.toThrow('rollback');
    expect(handler).not.toHaveBeenCalled();
  });

  it('zdarzenie opublikowane w kontekście automatyzacji ma causationDepth + 1', async () => {
    const bus = new DomainEventBus();
    const handler = jest.fn();
    bus.subscribe('FORM_APPROVED', handler);

    await causationContext.run({ depth: 2 }, () =>
      bus.publish({ type: 'FORM_APPROVED', subject: { type: 'FORM_INSTANCE', id: 1 } }));

    expect(handler.mock.calls[0][0].causationDepth).toBe(3);
  });
});

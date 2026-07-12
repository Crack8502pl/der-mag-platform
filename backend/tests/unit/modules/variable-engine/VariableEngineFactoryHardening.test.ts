/**
 * Unit tests – VariableEngineFactory async init (L-07) and rollback (L-10)
 */

import { VariableEngineFactory } from '../../../../src/modules/variable-engine/factory/VariableEngineFactory';
import { NamespaceConflictError } from '../../../../src/modules/variable-engine/errors';
import type { IVariableProvider, VariableContext, VariableValue } from '../../../../src/modules/variable-engine/contracts';

const ctx: VariableContext = { entityId: 1, entityType: 'task' };

function makeProvider(namespaces: string[], value: VariableValue = 'ok'): IVariableProvider {
  return {
    namespaces,
    resolve: jest.fn().mockResolvedValue(value),
  };
}

// ── Async initialisation (L-07) ───────────────────────────────────────────────

describe('VariableEngineFactory – async init (L-07)', () => {
  it('createAsync calls initialize() on providers with it', async () => {
    const p1 = { ...makeProvider(['camera']), initialize: jest.fn().mockResolvedValue(undefined) };
    const p2 = makeProvider(['fiber']); // no initialize

    const factory = new VariableEngineFactory([p1, p2]);
    await factory.createAsync();

    expect(p1.initialize).toHaveBeenCalledTimes(1);
  });

  it('createAsync calls initialize() in registration order', async () => {
    const order: string[] = [];
    const p1 = {
      ...makeProvider(['camera']),
      initialize: jest.fn().mockImplementation(async () => { order.push('camera'); }),
    };
    const p2 = {
      ...makeProvider(['fiber']),
      initialize: jest.fn().mockImplementation(async () => { order.push('fiber'); }),
    };

    const factory = new VariableEngineFactory([p1, p2]);
    await factory.createAsync();

    expect(order).toEqual(['camera', 'fiber']);
  });

  it('create() (sync) does NOT call initialize()', () => {
    const p1 = { ...makeProvider(['camera']), initialize: jest.fn().mockResolvedValue(undefined) };
    const factory = new VariableEngineFactory([p1]);
    factory.create();
    expect(p1.initialize).not.toHaveBeenCalled();
  });

  it('createAsync still wires the engine correctly', async () => {
    const p = makeProvider(['camera'], 42);
    const factory = new VariableEngineFactory([p]);
    const { engine } = await factory.createAsync();
    const result = await engine.evaluate('${camera.total}', ctx);
    expect(result).toBe('42');
  });
});

// ── Rollback on registration failure (L-10) ───────────────────────────────────

describe('VariableEngineFactory – rollback on conflict (L-10)', () => {
  it('throws NamespaceConflictError when two providers claim the same namespace', () => {
    const p1 = makeProvider(['camera']);
    const p2 = makeProvider(['camera']);
    const factory = new VariableEngineFactory([p1, p2]);
    expect(() => factory.create()).toThrow(NamespaceConflictError);
  });
});

// ── L2 cache wiring (L-01) ────────────────────────────────────────────────────

describe('VariableEngineFactory – L2 cache wiring (L-01)', () => {
  it('creates engine with L2 cache option without error', () => {
    const { NullL2VariableCache } = require('../../../../src/modules/variable-engine/cache/NullL2VariableCache');
    const p = makeProvider(['camera'], 'value');
    const factory = new VariableEngineFactory([p], {
      cache: { l2: new NullL2VariableCache(), l2TtlMs: 30_000 },
    });
    expect(() => factory.create()).not.toThrow();
  });
});

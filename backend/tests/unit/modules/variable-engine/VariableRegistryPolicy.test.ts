/**
 * Unit tests – VariableRegistry overwrite policy (L-08) and rollback (L-10)
 */

import { VariableRegistry } from '../../../../src/modules/variable-engine/registry/VariableRegistry';
import { NamespaceConflictError } from '../../../../src/modules/variable-engine/errors';
import type { IVariableProvider, VariableContext, VariableValue } from '../../../../src/modules/variable-engine/contracts';

function makeProvider(namespaces: string[]): IVariableProvider {
  return {
    namespaces,
    resolve: jest.fn().mockResolvedValue(undefined),
  };
}

describe('VariableRegistry – overwrite policy (L-08)', () => {
  it('throws NamespaceConflictError by default (strict mode)', () => {
    const registry = new VariableRegistry();
    const p1 = makeProvider(['camera']);
    const p2 = makeProvider(['camera']);
    registry.register(p1);
    expect(() => registry.register(p2)).toThrow(NamespaceConflictError);
  });

  it('overwritePolicy: error – throws on conflict', () => {
    const registry = new VariableRegistry({ overwritePolicy: 'error' });
    registry.register(makeProvider(['camera']));
    expect(() => registry.register(makeProvider(['camera']))).toThrow(NamespaceConflictError);
  });

  it('overwritePolicy: warn – logs warning and overwrites', () => {
    const warnMock = jest.fn();
    const logger = { error: jest.fn(), warn: warnMock, trace: jest.fn() };
    const registry = new VariableRegistry({ overwritePolicy: 'warn', logger });

    const p1 = makeProvider(['camera']);
    const p2 = makeProvider(['camera']);
    registry.register(p1);
    registry.register(p2); // should not throw

    expect(warnMock).toHaveBeenCalled();
    expect(warnMock).toHaveBeenCalledTimes(1);
    expect(warnMock.mock.calls[0][0]).toContain('overwrite');
    // p2 should now be registered
    expect(registry.find('camera.total')).toBe(p2);
  });

  it('overwritePolicy: overwrite – silently overwrites', () => {
    const registry = new VariableRegistry({ overwritePolicy: 'overwrite' });
    const p1 = makeProvider(['camera']);
    const p2 = makeProvider(['camera']);
    registry.register(p1);
    expect(() => registry.register(p2)).not.toThrow();
    expect(registry.find('camera.total')).toBe(p2);
  });

  it('legacy overwrite: true flag maps to overwrite policy', () => {
    const registry = new VariableRegistry({ overwrite: true });
    const p1 = makeProvider(['camera']);
    const p2 = makeProvider(['camera']);
    registry.register(p1);
    expect(() => registry.register(p2)).not.toThrow();
    expect(registry.find('camera.total')).toBe(p2);
  });
});

describe('VariableRegistry – registerAll rollback (L-10)', () => {
  it('registerAll commits all providers on success', () => {
    const registry = new VariableRegistry();
    const p1 = makeProvider(['camera']);
    const p2 = makeProvider(['fiber']);
    registry.registerAll([p1, p2]);
    expect(registry.find('camera.total')).toBe(p1);
    expect(registry.find('fiber.total')).toBe(p2);
  });

  it('registerAll rolls back on conflict: no providers registered', () => {
    const registry = new VariableRegistry();
    const p1 = makeProvider(['camera']);
    const p2 = makeProvider(['camera']); // conflict!
    expect(() => registry.registerAll([p1, p2])).toThrow(NamespaceConflictError);
    // Both should be rolled back
    expect(registry.find('camera.total')).toBeUndefined();
    expect(registry.getAll()).toHaveLength(0);
  });

  it('registerAll rolls back partially registered batch', () => {
    const registry = new VariableRegistry();
    const p1 = makeProvider(['camera']);
    const p2 = makeProvider(['fiber']);
    const p3 = makeProvider(['fiber']); // conflict with p2!
    expect(() => registry.registerAll([p1, p2, p3])).toThrow(NamespaceConflictError);
    // p1 and p2 should be rolled back too
    expect(registry.find('camera.total')).toBeUndefined();
    expect(registry.find('fiber.total')).toBeUndefined();
  });

  it('registry state is unchanged after failed registerAll', () => {
    const registry = new VariableRegistry();
    // Pre-register a provider
    const pre = makeProvider(['existing']);
    registry.register(pre);

    const p1 = makeProvider(['camera']);
    const p2 = makeProvider(['camera']); // conflict!
    expect(() => registry.registerAll([p1, p2])).toThrow();
    // Pre-existing provider should still be there
    expect(registry.find('existing.x')).toBe(pre);
    // Failed batch should be cleaned up
    expect(registry.find('camera.total')).toBeUndefined();
  });
});

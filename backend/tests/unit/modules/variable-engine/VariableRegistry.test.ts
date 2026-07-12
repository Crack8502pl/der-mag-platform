/**
 * Unit tests – VariableRegistry
 */

import { VariableRegistry } from '../../../../src/modules/variable-engine/registry/VariableRegistry';
import { NamespaceConflictError } from '../../../../src/modules/variable-engine/errors';
import type { IVariableProvider, VariableContext, VariableValue } from '../../../../src/modules/variable-engine/contracts';

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeProvider(namespaces: string[], name = 'TestProvider'): IVariableProvider {
  class P implements IVariableProvider {
    readonly namespaces = namespaces;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async resolve(_expression: string, _context: VariableContext): Promise<VariableValue> {
      return undefined;
    }
  }
  Object.defineProperty(P, 'name', { value: name });
  return new P();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VariableRegistry', () => {
  let registry: VariableRegistry;

  beforeEach(() => {
    registry = new VariableRegistry();
  });

  // ── register ─────────────────────────────────────────────────────────────────

  it('registers a provider without error', () => {
    const p = makeProvider(['camera']);
    expect(() => registry.register(p)).not.toThrow();
  });

  it('throws NamespaceConflictError for duplicate namespace (strict mode)', () => {
    registry.register(makeProvider(['camera'], 'Provider1'));
    expect(() => registry.register(makeProvider(['camera'], 'Provider2'))).toThrow(
      NamespaceConflictError
    );
  });

  it('allows overwrite when option is set', () => {
    const reg = new VariableRegistry({ overwrite: true });
    reg.register(makeProvider(['camera'], 'Provider1'));
    expect(() => reg.register(makeProvider(['camera'], 'Provider2'))).not.toThrow();
  });

  it('registers a provider claiming multiple namespaces', () => {
    const p = makeProvider(['fiber', 'cable']);
    registry.register(p);
    expect(registry.find('fiber.length')).toBe(p);
    expect(registry.find('cable.count')).toBe(p);
  });

  // ── find ──────────────────────────────────────────────────────────────────────

  it('finds a registered provider by namespace prefix', () => {
    const p = makeProvider(['camera']);
    registry.register(p);
    expect(registry.find('camera.total')).toBe(p);
  });

  it('returns undefined for an unregistered namespace', () => {
    expect(registry.find('unknown.metric')).toBeUndefined();
  });

  it('extracts namespace from expression with no dots', () => {
    const p = makeProvider(['count']);
    registry.register(p);
    expect(registry.find('count')).toBe(p);
  });

  it('uses only the first segment as namespace for deep paths', () => {
    const p = makeProvider(['fiber']);
    registry.register(p);
    expect(registry.find('fiber.length.total')).toBe(p);
  });

  // ── getAll ────────────────────────────────────────────────────────────────────

  it('returns all registered providers (deduplicated)', () => {
    const p1 = makeProvider(['camera']);
    const p2 = makeProvider(['fiber', 'cable']);
    registry.register(p1);
    registry.register(p2);
    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all).toContain(p1);
    expect(all).toContain(p2);
  });

  it('returns empty array when no providers are registered', () => {
    expect(registry.getAll()).toEqual([]);
  });
});

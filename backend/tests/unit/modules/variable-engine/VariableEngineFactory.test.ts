/**
 * Unit tests – VariableEngineFactory
 *
 * Verifies:
 * - Auto-registration of providers on factory.create()
 * - Namespace conflict detection (strict / overwrite modes)
 * - End-to-end evaluation using the wired engine (OCP: new providers without
 *   modifying core code)
 * - Empty provider list (degenerate case)
 * - Repeated create() calls return independent instances
 */

import { VariableEngineFactory } from '../../../../src/modules/variable-engine/factory/VariableEngineFactory';
import { NamespaceConflictError } from '../../../../src/modules/variable-engine/errors';
import type { IVariableProvider, VariableContext, VariableValue } from '../../../../src/modules/variable-engine/contracts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProvider(
  namespaces: string[],
  valueMap: Record<string, VariableValue> = {},
  name = 'TestProvider'
): IVariableProvider {
  class P implements IVariableProvider {
    readonly namespaces = namespaces;
    async resolve(expression: string, _context: VariableContext): Promise<VariableValue> {
      return valueMap[expression];
    }
  }
  Object.defineProperty(P, 'name', { value: name });
  return new P();
}

const ctx: VariableContext = { entityId: 1, entityType: 'test' };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VariableEngineFactory', () => {
  // ── Basic wiring ──────────────────────────────────────────────────────────────

  it('creates an engine and registry without error', () => {
    const factory = new VariableEngineFactory([makeProvider(['camera'])]);
    expect(() => factory.create()).not.toThrow();
  });

  it('returns a non-null engine and registry', () => {
    const factory = new VariableEngineFactory([makeProvider(['camera'])]);
    const { engine, registry } = factory.create();
    expect(engine).toBeDefined();
    expect(registry).toBeDefined();
  });

  // ── Auto-registration ─────────────────────────────────────────────────────────

  it('auto-registers all injected providers', () => {
    const p1 = makeProvider(['camera'], {}, 'CameraProvider');
    const p2 = makeProvider(['fiber'], {}, 'FiberProvider');
    const { registry } = new VariableEngineFactory([p1, p2]).create();
    expect(registry.find('camera.total')).toBe(p1);
    expect(registry.find('fiber.length')).toBe(p2);
  });

  it('registers a provider with multiple namespaces', () => {
    const p = makeProvider(['fiber', 'cable'], {}, 'FiberCableProvider');
    const { registry } = new VariableEngineFactory([p]).create();
    expect(registry.find('fiber.total')).toBe(p);
    expect(registry.find('cable.count')).toBe(p);
  });

  it('returns empty getAll() when no providers are supplied', () => {
    const { registry } = new VariableEngineFactory([]).create();
    expect(registry.getAll()).toEqual([]);
  });

  it('getAll() lists every registered provider (deduplicated)', () => {
    const p1 = makeProvider(['camera'], {}, 'CameraProvider');
    const p2 = makeProvider(['fiber', 'cable'], {}, 'FiberProvider');
    const { registry } = new VariableEngineFactory([p1, p2]).create();
    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all).toContain(p1);
    expect(all).toContain(p2);
  });

  // ── Namespace conflict detection ───────────────────────────────────────────────

  it('throws NamespaceConflictError when two providers claim the same namespace (strict mode)', () => {
    const factory = new VariableEngineFactory([
      makeProvider(['camera'], {}, 'Provider1'),
      makeProvider(['camera'], {}, 'Provider2'),
    ]);
    expect(() => factory.create()).toThrow(NamespaceConflictError);
  });

  it('includes conflicting namespace in the error message', () => {
    const factory = new VariableEngineFactory([
      makeProvider(['camera'], {}, 'Provider1'),
      makeProvider(['camera'], {}, 'Provider2'),
    ]);
    expect(() => factory.create()).toThrow(/camera/);
  });

  it('allows overwrite when registry option is set', () => {
    const p2 = makeProvider(['camera'], {}, 'Provider2');
    const factory = new VariableEngineFactory(
      [makeProvider(['camera'], {}, 'Provider1'), p2],
      { registry: { overwrite: true } }
    );
    expect(() => factory.create()).not.toThrow();
    // The second provider wins
    const { registry } = factory.create();
    expect(registry.find('camera.total')).toBe(p2);
  });

  // ── OCP: end-to-end evaluation without core changes ───────────────────────────

  it('evaluates a template using auto-registered providers (OCP demo)', async () => {
    const cameraProvider = makeProvider(['camera'], { 'camera.total': 5 }, 'CameraProvider');
    const fiberProvider = makeProvider(['fiber'], { 'fiber.length.total': 120 }, 'FiberProvider');

    const { engine } = new VariableEngineFactory([cameraProvider, fiberProvider]).create();

    const result = await engine.evaluate(
      'Cameras: ${camera.total}, Fiber: ${fiber.length.total} m',
      ctx
    );
    expect(result).toBe('Cameras: 5, Fiber: 120 m');
  });

  it('returns fallback for unresolvable expressions', async () => {
    const { engine } = new VariableEngineFactory([]).create();
    const result = await engine.evaluate('Value: ${missing.metric}', ctx, { fallback: 'N/A' });
    expect(result).toBe('Value: N/A');
  });

  // ── Independent instances ─────────────────────────────────────────────────────

  it('each create() call returns an independent instance', () => {
    const factory = new VariableEngineFactory([makeProvider(['camera'])]);
    const a = factory.create();
    const b = factory.create();
    expect(a.engine).not.toBe(b.engine);
    expect(a.registry).not.toBe(b.registry);
  });

  it('modifications to one instance do not affect another', () => {
    const factory = new VariableEngineFactory([makeProvider(['camera'], {}, 'CameraProvider')]);
    const a = factory.create();
    const b = factory.create();
    // Register an extra provider into instance A only
    a.registry.register(makeProvider(['extra'], {}, 'ExtraProvider'));
    expect(a.registry.getAll()).toHaveLength(2);
    expect(b.registry.getAll()).toHaveLength(1);
  });
});

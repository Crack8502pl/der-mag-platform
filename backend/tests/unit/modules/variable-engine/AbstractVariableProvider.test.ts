/**
 * Unit tests – AbstractVariableProvider
 *
 * Verifies the base-class helpers: abstract contract fulfilment and the
 * `extractField` utility method.
 */

import { AbstractVariableProvider } from '../../../../src/modules/variable-engine/providers/AbstractVariableProvider';
import type { VariableContext, VariableValue } from '../../../../src/modules/variable-engine/contracts';

// ─── Concrete sub-class used by tests ─────────────────────────────────────────

class StubProvider extends AbstractVariableProvider {
  readonly namespaces: readonly string[];

  constructor(namespaces: string[]) {
    super();
    this.namespaces = namespaces;
  }

  async resolve(expression: string, _context: VariableContext): Promise<VariableValue> {
    // Expose extractField result for testing
    return this.extractField(expression) || undefined;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const ctx: VariableContext = { entityId: 1, entityType: 'test' };

describe('AbstractVariableProvider', () => {
  // ── Contract ─────────────────────────────────────────────────────────────────

  it('satisfies IVariableProvider by implementing namespaces and resolve', async () => {
    const p = new StubProvider(['camera']);
    expect(p.namespaces).toEqual(['camera']);
    await expect(p.resolve('camera.total', ctx)).resolves.not.toThrow();
  });

  it('can declare multiple namespaces', () => {
    const p = new StubProvider(['fiber', 'cable']);
    expect(p.namespaces).toContain('fiber');
    expect(p.namespaces).toContain('cable');
  });

  // ── extractField ──────────────────────────────────────────────────────────────

  it('extracts field from a two-segment expression', async () => {
    const p = new StubProvider(['camera']);
    expect(await p.resolve('camera.total', ctx)).toBe('total');
  });

  it('extracts field from a three-segment expression', async () => {
    const p = new StubProvider(['fiber']);
    expect(await p.resolve('fiber.length.total', ctx)).toBe('length.total');
  });

  it('returns empty string when expression has no dot (namespace only)', async () => {
    const p = new StubProvider(['count']);
    // resolve returns `undefined` when extractField is ''
    expect(await p.resolve('count', ctx)).toBeUndefined();
  });

  it('works when the expression equals the namespace exactly', async () => {
    const p = new StubProvider(['count']);
    expect(await p.resolve('count', ctx)).toBeUndefined();
  });
});

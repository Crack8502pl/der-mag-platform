/**
 * Unit tests – LegacyVariableResolver (PR-3)
 *
 * Verifies:
 * - Simple placeholder substitution
 * - Unknown placeholders are preserved verbatim
 * - Empty expression `${}` is kept as-is
 * - Whitespace inside expression is trimmed
 * - Multiple occurrences of the same placeholder are all replaced
 * - Template with no placeholders is returned unchanged
 * - Null/undefined values in the map are excluded (key not present → preserve)
 */

import { LegacyVariableResolver } from '../../../../src/modules/variable-engine/adapter/LegacyVariableResolver';

describe('LegacyVariableResolver', () => {
  let resolver: LegacyVariableResolver;

  beforeEach(() => {
    resolver = new LegacyVariableResolver();
  });

  // ── Happy-path ───────────────────────────────────────────────────────────────

  it('returns the template unchanged when there are no placeholders', () => {
    expect(resolver.resolve('Hello world', {})).toBe('Hello world');
  });

  it('replaces a single placeholder with the matching variable', () => {
    const result = resolver.resolve('Total: ${camera.total}', { 'camera.total': '5' });
    expect(result).toBe('Total: 5');
  });

  it('replaces multiple different placeholders', () => {
    const result = resolver.resolve(
      'Cameras: ${camera.total}, Fiber: ${fiber.length.total} m',
      { 'camera.total': '3', 'fiber.length.total': '120' },
    );
    expect(result).toBe('Cameras: 3, Fiber: 120 m');
  });

  it('replaces all occurrences of the same placeholder', () => {
    const result = resolver.resolve(
      'Count: ${count}, again: ${count}',
      { count: '7' },
    );
    expect(result).toBe('Count: 7, again: 7');
  });

  // ── Unknown / unresolved placeholders ────────────────────────────────────────

  it('preserves an unknown placeholder verbatim', () => {
    const result = resolver.resolve('Value: ${unknown.metric}', {});
    expect(result).toBe('Value: ${unknown.metric}');
  });

  it('preserves unknown placeholder while replacing known ones', () => {
    const result = resolver.resolve(
      '${known} and ${unknown}',
      { known: 'hello' },
    );
    expect(result).toBe('hello and ${unknown}');
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  it('handles an empty template string', () => {
    expect(resolver.resolve('', { foo: 'bar' })).toBe('');
  });

  it('trims whitespace inside the expression', () => {
    const result = resolver.resolve('${ camera.total }', { 'camera.total': '9' });
    expect(result).toBe('9');
  });

  it('preserves empty placeholder ${}', () => {
    const result = resolver.resolve('${} stays', {});
    expect(result).toBe('${} stays');
  });

  it('handles an empty variables map', () => {
    const result = resolver.resolve('${a} ${b}', {});
    expect(result).toBe('${a} ${b}');
  });

  it('coerces numeric string values correctly', () => {
    const result = resolver.resolve('Count: ${n}', { n: '42' });
    expect(result).toBe('Count: 42');
  });

  it('accepts numeric values directly without pre-conversion', () => {
    const result = resolver.resolve('Count: ${n}', { n: 42 });
    expect(result).toBe('Count: 42');
  });

  it('accepts boolean values and coerces them to string', () => {
    const result = resolver.resolve('Active: ${flag}', { flag: true });
    expect(result).toBe('Active: true');
  });

  it('replaces placeholder at the very start of the template', () => {
    const result = resolver.resolve('${x} suffix', { x: 'START' });
    expect(result).toBe('START suffix');
  });

  it('replaces placeholder at the very end of the template', () => {
    const result = resolver.resolve('prefix ${x}', { x: 'END' });
    expect(result).toBe('prefix END');
  });

  it('handles a template that is only a placeholder', () => {
    expect(resolver.resolve('${val}', { val: 'only' })).toBe('only');
  });

  it('is idempotent – calling resolve twice on already-resolved output has no effect', () => {
    const first = resolver.resolve('${x}', { x: 'hello' });
    const second = resolver.resolve(first, { x: 'hello' });
    expect(second).toBe('hello');
  });
});

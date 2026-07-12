/**
 * Unit tests – parseFunctionCall utility (post-PR-10: L-20/L-21)
 */

import { parseFunctionCall } from '../../../../src/modules/variable-engine/functions/parseFunctionCall';

describe('parseFunctionCall', () => {
  // ── Returns null for plain dot-notation expressions ──────────────────────────

  it('returns null for a plain identifier', () => {
    expect(parseFunctionCall('children')).toBeNull();
  });

  it('returns null for a dot-notation expression', () => {
    expect(parseFunctionCall('camera.total')).toBeNull();
  });

  it('returns null for a deep dot-notation expression', () => {
    expect(parseFunctionCall('fiber.length.total')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseFunctionCall('')).toBeNull();
  });

  // ── Parses valid function-call expressions ────────────────────────────────────

  it('parses count(children)', () => {
    const result = parseFunctionCall('count(children)');
    expect(result).toEqual({ funcName: 'count', argExpression: 'children', argExpressions: ['children'] });
  });

  it('parses round(fiber.length.total)', () => {
    const result = parseFunctionCall('round(fiber.length.total)');
    expect(result).toEqual({ funcName: 'round', argExpression: 'fiber.length.total', argExpressions: ['fiber.length.total'] });
  });

  it('parses uppercase(contract.customer.name)', () => {
    const result = parseFunctionCall('uppercase(contract.customer.name)');
    expect(result).toEqual({ funcName: 'uppercase', argExpression: 'contract.customer.name', argExpressions: ['contract.customer.name'] });
  });

  it('trims whitespace from the argument expression', () => {
    const result = parseFunctionCall('count( children )');
    expect(result).toEqual({ funcName: 'count', argExpression: 'children', argExpressions: ['children'] });
  });

  it('parses function call with leading/trailing whitespace around the whole expression', () => {
    const result = parseFunctionCall('  count(children)  ');
    expect(result).toEqual({ funcName: 'count', argExpression: 'children', argExpressions: ['children'] });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  it('returns null when closing paren is missing', () => {
    expect(parseFunctionCall('count(children')).toBeNull();
  });

  it('returns null when opening paren is missing', () => {
    expect(parseFunctionCall('countchildren)')).toBeNull();
  });

  it('returns null for just parens with no function name', () => {
    expect(parseFunctionCall('(children)')).toBeNull();
  });

  it('returns null when the function name starts with a digit', () => {
    expect(parseFunctionCall('1count(x)')).toBeNull();
  });

  it('parses function name with underscore prefix', () => {
    const result = parseFunctionCall('_fn(x)');
    expect(result).toEqual({ funcName: '_fn', argExpression: 'x', argExpressions: ['x'] });
  });

  it('parses function call with empty argument', () => {
    const result = parseFunctionCall('count()');
    expect(result).toEqual({ funcName: 'count', argExpression: '', argExpressions: [] });
  });

  // ── Nested function calls (L-03/L-20) ─────────────────────────────────────────

  it('parses nested function call: count(round(x))', () => {
    const result = parseFunctionCall('count(round(x))');
    expect(result).toEqual({ funcName: 'count', argExpression: 'round(x)', argExpressions: ['round(x)'] });
  });

  it('parses deeply nested function call: fn(count(round(x)))', () => {
    const result = parseFunctionCall('fn(count(round(x)))');
    expect(result).toEqual({ funcName: 'fn', argExpression: 'count(round(x))', argExpressions: ['count(round(x))'] });
  });

  // ── Multi-argument functions (L-21) ───────────────────────────────────────────

  it('parses two-argument function: pad(x, 5)', () => {
    const result = parseFunctionCall('pad(x, 5)');
    expect(result).toEqual({ funcName: 'pad', argExpression: 'x', argExpressions: ['x', '5'] });
  });

  it('parses three-argument function: format(date, "ISO", "UTC")', () => {
    const result = parseFunctionCall('format(date, "ISO", "UTC")');
    expect(result).toEqual({ funcName: 'format', argExpression: 'date', argExpressions: ['date', '"ISO"', '"UTC"'] });
  });

  it('does not split commas inside nested parens: fn(nested(a, b), c)', () => {
    const result = parseFunctionCall('fn(nested(a, b), c)');
    expect(result).toEqual({ funcName: 'fn', argExpression: 'nested(a, b)', argExpressions: ['nested(a, b)', 'c'] });
  });

  it('returns null when there are trailing chars after closing paren', () => {
    expect(parseFunctionCall('count(x) extra')).toBeNull();
  });
});


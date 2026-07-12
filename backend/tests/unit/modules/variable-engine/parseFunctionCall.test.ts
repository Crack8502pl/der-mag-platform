/**
 * Unit tests – parseFunctionCall utility (PR-8)
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
    expect(result).toEqual({ funcName: 'count', argExpression: 'children' });
  });

  it('parses round(fiber.length.total)', () => {
    const result = parseFunctionCall('round(fiber.length.total)');
    expect(result).toEqual({ funcName: 'round', argExpression: 'fiber.length.total' });
  });

  it('parses uppercase(contract.customer.name)', () => {
    const result = parseFunctionCall('uppercase(contract.customer.name)');
    expect(result).toEqual({ funcName: 'uppercase', argExpression: 'contract.customer.name' });
  });

  it('trims whitespace from the argument expression', () => {
    const result = parseFunctionCall('count( children )');
    expect(result).toEqual({ funcName: 'count', argExpression: 'children' });
  });

  it('parses function call with leading/trailing whitespace around the whole expression', () => {
    const result = parseFunctionCall('  count(children)  ');
    expect(result).toEqual({ funcName: 'count', argExpression: 'children' });
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
    expect(result).toEqual({ funcName: '_fn', argExpression: 'x' });
  });

  it('parses function call with empty argument', () => {
    const result = parseFunctionCall('count()');
    expect(result).toEqual({ funcName: 'count', argExpression: '' });
  });
});

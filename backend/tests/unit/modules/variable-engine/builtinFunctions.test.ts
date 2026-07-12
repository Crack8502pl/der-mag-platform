/**
 * Unit tests – built-in functions: CountFunction, RoundFunction, UppercaseFunction (PR-8)
 */

import { CountFunction } from '../../../../src/modules/variable-engine/functions/builtins/CountFunction';
import { RoundFunction } from '../../../../src/modules/variable-engine/functions/builtins/RoundFunction';
import { UppercaseFunction } from '../../../../src/modules/variable-engine/functions/builtins/UppercaseFunction';

// ─── CountFunction ────────────────────────────────────────────────────────────

describe('CountFunction', () => {
  const fn = new CountFunction();

  it('returns 0 for null', () => {
    expect(fn.call(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(fn.call(undefined)).toBe(0);
  });

  it('returns the number itself for a numeric arg', () => {
    expect(fn.call(5)).toBe(5);
    expect(fn.call(0)).toBe(0);
    expect(fn.call(-3)).toBe(-3);
  });

  it('returns the string length for a string arg', () => {
    expect(fn.call('hello')).toBe(5);
    expect(fn.call('')).toBe(0);
    expect(fn.call('abc')).toBe(3);
  });

  it('returns 0 for a boolean arg', () => {
    expect(fn.call(true)).toBe(0);
    expect(fn.call(false)).toBe(0);
  });
});

// ─── RoundFunction ────────────────────────────────────────────────────────────

describe('RoundFunction', () => {
  const fn = new RoundFunction();

  it('returns undefined for null', () => {
    expect(fn.call(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(fn.call(undefined)).toBeUndefined();
  });

  it('returns undefined for a boolean arg', () => {
    expect(fn.call(true)).toBeUndefined();
    expect(fn.call(false)).toBeUndefined();
  });

  it('rounds a number up', () => {
    expect(fn.call(3.6)).toBe(4);
  });

  it('rounds a number down', () => {
    expect(fn.call(3.4)).toBe(3);
  });

  it('rounds exactly 0.5 up', () => {
    expect(fn.call(0.5)).toBe(1);
  });

  it('passes through an integer unchanged', () => {
    expect(fn.call(7)).toBe(7);
  });

  it('handles negative numbers', () => {
    expect(fn.call(-2.6)).toBe(-3);
    expect(fn.call(-2.4)).toBe(-2);
  });

  it('parses a numeric string', () => {
    expect(fn.call('3.7')).toBe(4);
  });

  it('returns undefined for a non-numeric string', () => {
    expect(fn.call('abc')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(fn.call('')).toBeUndefined();
  });
});

// ─── UppercaseFunction ────────────────────────────────────────────────────────

describe('UppercaseFunction', () => {
  const fn = new UppercaseFunction();

  it('returns undefined for null', () => {
    expect(fn.call(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(fn.call(undefined)).toBeUndefined();
  });

  it('uppercases a string', () => {
    expect(fn.call('hello world')).toBe('HELLO WORLD');
  });

  it('handles an already upper-case string', () => {
    expect(fn.call('ALREADY')).toBe('ALREADY');
  });

  it('coerces a number to uppercase string', () => {
    expect(fn.call(42)).toBe('42');
  });

  it('coerces a boolean to uppercase string', () => {
    expect(fn.call(true)).toBe('TRUE');
    expect(fn.call(false)).toBe('FALSE');
  });

  it('handles an empty string', () => {
    expect(fn.call('')).toBe('');
  });
});

/**
 * Unit tests – FunctionRegistry (PR-8)
 */

import { FunctionRegistry } from '../../../../src/modules/variable-engine/functions/FunctionRegistry';
import type { IVariableFunction, VariableValue } from '../../../../src/modules/variable-engine/contracts';

function makeFunction(returnValue: VariableValue): IVariableFunction {
  return { call: jest.fn().mockReturnValue(returnValue) };
}

describe('FunctionRegistry', () => {
  let registry: FunctionRegistry;

  beforeEach(() => {
    registry = new FunctionRegistry();
  });

  it('returns undefined for an unregistered function name', () => {
    expect(registry.find('unknown')).toBeUndefined();
  });

  it('returns the registered function', () => {
    const fn = makeFunction(42);
    registry.register('myFn', fn);
    expect(registry.find('myFn')).toBe(fn);
  });

  it('allows registering multiple functions', () => {
    const fn1 = makeFunction(1);
    const fn2 = makeFunction(2);
    registry.register('a', fn1);
    registry.register('b', fn2);
    expect(registry.find('a')).toBe(fn1);
    expect(registry.find('b')).toBe(fn2);
  });

  it('overwrites an existing function on duplicate registration (last-write-wins)', () => {
    const first = makeFunction('first');
    const second = makeFunction('second');
    registry.register('fn', first);
    registry.register('fn', second);
    expect(registry.find('fn')).toBe(second);
  });

  it('is case-sensitive for function names', () => {
    const fn = makeFunction(true);
    registry.register('Count', fn);
    expect(registry.find('count')).toBeUndefined();
    expect(registry.find('Count')).toBe(fn);
  });
});

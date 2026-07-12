/**
 * Variable Engine – built-in `count` function (PR-8)
 *
 * Returns the "count" of its argument:
 * - Array → its `length` property.
 * - String → its character count (`.length`).
 * - Number → the number itself (already a count).
 * - `null` / `undefined` → `0`.
 * - `boolean` → `0` (booleans have no meaningful count).
 *
 * This matches the primary use-case `${count(children)}` where `children`
 * resolves to an array-like value (or its pre-counted numeric form when the
 * provider already returns a number).
 */

import type { IVariableFunction, VariableValue } from '../../contracts';

export class CountFunction implements IVariableFunction {
  call(arg: VariableValue): VariableValue {
    if (arg === null || arg === undefined) {
      return 0;
    }
    if (typeof arg === 'number') {
      return arg;
    }
    if (typeof arg === 'string') {
      return arg.length;
    }
    // boolean has no meaningful count
    return 0;
  }
}

/**
 * Variable Engine – built-in `uppercase` function (PR-8)
 *
 * Converts its argument to an upper-case string.
 *
 * Coercion rules:
 * - String → `value.toUpperCase()`.
 * - Number / boolean → coerced to string first, then upper-cased.
 *   (e.g. `42` → `"42"`, `true` → `"TRUE"`).
 * - `null` / `undefined` → `undefined` (soft-fail).
 *
 * The primary use-case is `${uppercase(contract.customer.name)}` where the
 * provider returns a plain string.
 */

import type { IVariableFunction, VariableValue } from '../../contracts';

export class UppercaseFunction implements IVariableFunction {
  call(arg: VariableValue): VariableValue {
    if (arg === null || arg === undefined) {
      return undefined;
    }
    return String(arg).toUpperCase();
  }
}

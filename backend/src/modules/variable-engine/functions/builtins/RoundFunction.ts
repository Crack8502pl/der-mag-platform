/**
 * Variable Engine – built-in `round` function (PR-8)
 *
 * Rounds its argument to the nearest integer using `Math.round()`.
 *
 * Coercion rules:
 * - Number → `Math.round(value)`.
 * - String → parsed with `parseFloat`; if the result is `NaN` the function
 *   returns `undefined` (soft-fail).
 * - `null` / `undefined` → `undefined` (soft-fail).
 * - `boolean` → `undefined` (booleans are not numeric; soft-fail).
 *
 * Returning `undefined` on non-numeric input means the containing template
 * token falls back to the configured `FallbackMode` rather than showing `NaN`.
 */

import type { IVariableFunction, VariableValue } from '../../contracts';

export class RoundFunction implements IVariableFunction {
  call(arg: VariableValue): VariableValue {
    if (arg === null || arg === undefined) {
      return undefined;
    }
    if (typeof arg === 'boolean') {
      return undefined;
    }
    if (typeof arg === 'number') {
      return Math.round(arg);
    }
    // string – attempt numeric parse
    const parsed = parseFloat(arg);
    if (isNaN(parsed)) {
      return undefined;
    }
    return Math.round(parsed);
  }
}

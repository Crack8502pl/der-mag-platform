/**
 * Variable Engine – LegacyVariableResolver (PR-3 scope)
 *
 * Provides a simple, synchronous `${...}` placeholder substitution that
 * mirrors the behaviour of the legacy template resolver used before the new
 * Variable Engine was introduced.
 *
 * ## Behaviour
 *
 * - Scans the template for `${expression}` tokens (same regex as
 *   `VariableParser`, sourced from the shared `tokenPattern` module).
 * - Looks up each `expression` (trimmed) in the supplied `variables` map.
 * - Replaces matched tokens with the string-coerced value found in the map.
 * - When a variable is **not found** in the map the original placeholder is
 *   preserved as-is (identical to old behaviour – no silent data loss).
 *
 * ## Limitations (intentional – legacy compatibility)
 *
 * - No async resolution – values must be supplied upfront in `variables`.
 * - No cache, no registry, no provider lookup.
 * - Nested `${...}` expressions are not supported.
 *
 * @deprecated Since PR-10 (Final Rollout) the new Variable Engine
 * (`IVariableEvaluator` / `VariableEvaluator`) is the default rendering path.
 * This class is retained only as a rollback safety net and will be removed in
 * a future cleanup PR once all consumers have migrated.  To trigger the legacy
 * path set `VARIABLE_ENGINE_V2=false`.
 */

import { createTokenPattern } from '../parser/tokenPattern';

/** Acceptable scalar types for the flat variable map. */
export type LegacyVariableValue = string | number | boolean;

export class LegacyVariableResolver {
  /**
   * Replace `${...}` placeholders in `template` using the supplied flat map
   * of variable values.
   *
   * Numeric and boolean values are automatically coerced to their string
   * representations so callers do not need to pre-convert them.
   *
   * @param template  – Template string that may contain `${expression}` tokens.
   * @param variables – Flat map of `{ expression: value }` pairs.
   * @returns Rendered string.  Unknown placeholders are kept verbatim.
   */
  resolve(template: string, variables: Readonly<Record<string, LegacyVariableValue>>): string {
    // Create a fresh regex per call so lastIndex is never shared.
    const TOKEN_PATTERN = createTokenPattern();
    return template.replace(TOKEN_PATTERN, (_match, rawExpression: string) => {
      const expression = rawExpression.trim();
      if (expression.length === 0) {
        return _match;
      }
      const value = variables[expression];
      return value !== undefined ? String(value) : _match;
    });
  }
}

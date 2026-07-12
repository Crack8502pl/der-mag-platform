/**
 * Variable Engine – shared token pattern (internal)
 *
 * Single source of truth for the `${...}` placeholder regex used by
 * `LegacyVariableResolver` (legacy path only).
 *
 * **Note:** `VariableParser` no longer uses this regex.  It uses a
 * stack-based parser (L-02, L-06 fix) that correctly handles nested
 * `${...}` expressions and literal `}` characters inside placeholders.
 *
 * The regex is retained here for the legacy resolver which does not need
 * nested-brace support (it performs simple flat-map substitution).
 *
 * @internal – not part of the public module API.
 */

/** Source string for the `${...}` placeholder pattern (no flags). */
export const VARIABLE_TOKEN_PATTERN_SOURCE = '\\$\\{([^}]*)\\}';

/**
 * Create a fresh `RegExp` instance for the `${...}` placeholder pattern
 * with the `g` (global) flag, ensuring independent `lastIndex` tracking.
 */
export function createTokenPattern(): RegExp {
  return new RegExp(VARIABLE_TOKEN_PATTERN_SOURCE, 'g');
}

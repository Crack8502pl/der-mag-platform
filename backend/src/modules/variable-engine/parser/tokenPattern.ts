/**
 * Variable Engine – shared token pattern (internal)
 *
 * Single source of truth for the `${...}` placeholder regex used by both
 * `VariableParser` and `LegacyVariableResolver`.
 *
 * Both consumers create their own `RegExp` instance from this source string
 * so that the mutable `lastIndex` state is never shared between callers.
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

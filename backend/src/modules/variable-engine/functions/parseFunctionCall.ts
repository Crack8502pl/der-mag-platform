/**
 * Variable Engine – parseFunctionCall utility (PR-8)
 *
 * Detects whether a variable expression is a function-call form such as
 * `count(children)` or `round(fiber.length.total)` and, if so, decomposes
 * it into a function name and an argument expression.
 *
 * Supported syntax:
 * - `funcName(argExpression)`
 * - Function name: starts with a letter or `_`, followed by letters, digits,
 *   or `_` (no hyphens – keeps naming consistent with JS identifiers).
 * - Argument expression: anything except a closing `)`, trimmed of leading
 *   and trailing whitespace.
 * - Nested calls (e.g. `count(round(x))`) are intentionally **not** supported
 *   in PR-8 (MVP constraint: no parser redesign).
 *
 * Returns `null` for any expression that does not match the pattern, so callers
 * can fall back to normal dot-notation provider resolution.
 *
 * @internal – consumed by `VariableResolver`; not part of the public module API.
 */

import type { FunctionCallExpression } from '../contracts';

/** Regex that matches `funcName(argExpression)` function-call expressions. */
const FUNCTION_CALL_PATTERN = /^([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)$/;

/**
 * Parse `expression` as a function call.
 *
 * @param expression – Trimmed expression string from a `${...}` token.
 * @returns A `FunctionCallExpression` when the expression matches the
 *          `funcName(arg)` pattern, or `null` otherwise.
 *
 * @example
 * parseFunctionCall('count(children)')
 * // → { funcName: 'count', argExpression: 'children' }
 *
 * parseFunctionCall('camera.total')
 * // → null
 */
export function parseFunctionCall(expression: string): FunctionCallExpression | null {
  const match = FUNCTION_CALL_PATTERN.exec(expression.trim());
  if (!match) {
    return null;
  }
  return {
    funcName: match[1],
    argExpression: match[2].trim(),
  };
}

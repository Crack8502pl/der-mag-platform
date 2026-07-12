/**
 * Variable Engine – parseFunctionCall utility (post-PR-10, L-20/L-21)
 *
 * Detects whether a variable expression is a function-call form such as
 * `count(children)`, `round(fiber.length.total)`, `pad(x, 5)`, or
 * `count(round(x))` and, if so, decomposes it into a function name and
 * one or more argument expressions.
 *
 * Supported syntax:
 * - `funcName(arg1)` – single argument (backward-compatible)
 * - `funcName(arg1, arg2, ...)` – multiple arguments (L-21)
 * - `funcName(nested(x))` – nested function calls (L-03/L-20)
 * - Function name: starts with a letter or `_`, followed by letters, digits,
 *   or `_` (no hyphens – keeps naming consistent with JS identifiers).
 * - Each argument expression is trimmed of leading/trailing whitespace.
 * - Commas inside nested parentheses do NOT split arguments, e.g.
 *   `fn(round(x, y))` has one argument `round(x, y)`.
 *
 * Returns `null` for any expression that does not match the pattern, so
 * callers can fall back to normal dot-notation provider resolution.
 *
 * @internal – consumed by `VariableResolver`; not part of the public module API.
 */

import type { FunctionCallExpression } from '../contracts';

/** Regex that matches the function-name prefix of a call expression. */
const FUNC_NAME_PATTERN = /^([a-zA-Z_][a-zA-Z0-9_]*)\(/;

/**
 * Parse `expression` as a function call.
 *
 * Uses a parenthesis-depth counter so that nested calls like
 * `count(round(x))` are handled correctly.  Commas at depth > 1 are
 * treated as part of the inner argument, not as argument separators.
 *
 * @param expression – Trimmed expression string from a `${...}` token.
 * @returns A `FunctionCallExpression` when the expression matches the
 *          `funcName(...)` pattern, or `null` otherwise.
 *
 * @example
 * parseFunctionCall('count(children)')
 * // → { funcName: 'count', argExpression: 'children', argExpressions: ['children'] }
 *
 * parseFunctionCall('pad(x, 5)')
 * // → { funcName: 'pad', argExpression: 'x', argExpressions: ['x', '5'] }
 *
 * parseFunctionCall('count(round(x))')
 * // → { funcName: 'count', argExpression: 'round(x)', argExpressions: ['round(x)'] }
 *
 * parseFunctionCall('camera.total')
 * // → null
 */
export function parseFunctionCall(expression: string): FunctionCallExpression | null {
  const trimmed = expression.trim();

  // Quick check: must start with a valid identifier followed by `(`
  const nameMatch = FUNC_NAME_PATTERN.exec(trimmed);
  if (!nameMatch) {
    return null;
  }

  const funcName = nameMatch[1];
  const argsStart = nameMatch[0].length; // index right after the opening `(`

  // Walk the rest of the string tracking paren depth to find the matching `)`.
  // depth starts at 1 (we already consumed the opening `(`).
  let depth = 1;
  let i = argsStart;
  const str = trimmed;

  while (i < str.length && depth > 0) {
    const ch = str[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    i++;
  }

  // depth must reach 0 and we must be at the end of the string (no trailing chars)
  if (depth !== 0 || i !== str.length) {
    return null;
  }

  // The argument list is everything between the outer parens.
  const argsRaw = str.slice(argsStart, i - 1); // excludes the closing `)`

  // Split arguments on commas at depth 0 (not inside nested parens).
  const argExpressions = splitArguments(argsRaw);

  // Backward-compatible `argExpression`: first arg (or empty string if no args).
  const argExpression = argExpressions[0] ?? '';

  return { funcName, argExpression, argExpressions };
}

/**
 * Split a comma-separated argument list, respecting nested parentheses and
 * braces.  Returns trimmed argument strings.  An empty arg list returns `[]`.
 *
 * Depth tracking covers both `(...)` and `{...}` so that object-literal
 * arguments like `fn({a: 1}, {b: 2})` are split correctly (the comma inside
 * the object literals is at depth > 0 and is not treated as an argument
 * separator).
 */
function splitArguments(argsRaw: string): readonly string[] {
  if (argsRaw.trim().length === 0) {
    return [];
  }

  const args: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < argsRaw.length; i++) {
    const ch = argsRaw[i];
    if (ch === '(' || ch === '{') {
      depth++;
    } else if (ch === ')' || ch === '}') {
      depth--;
    } else if (ch === ',' && depth === 0) {
      args.push(argsRaw.slice(start, i).trim());
      start = i + 1;
    }
  }

  // Push the last argument.
  args.push(argsRaw.slice(start).trim());

  return args;
}

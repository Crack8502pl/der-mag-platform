/**
 * Variable Engine – VariableParser
 *
 * Responsible for extracting `${...}` placeholders from a template string.
 * Implements `IVariableParser` (see contracts).
 *
 * Design decisions:
 * - A single regex pass keeps the implementation O(n) with no allocations
 *   beyond the token array.
 * - Nested `${...}` expressions are not supported in PR-1 (MVP scope).
 *   Nested braces inside a placeholder are treated as literal characters.
 * - Whitespace inside the expression is trimmed before the token is emitted.
 * - Empty expressions `${}` are skipped (no token emitted).
 */

import type { IVariableParser, VariableToken } from '../contracts';
import { createTokenPattern } from './tokenPattern';

export class VariableParser implements IVariableParser {
  /**
   * Extract all `${...}` tokens from `template`.
   *
   * @param template – Any string that may contain `${expression}` placeholders.
   * @returns Array of tokens ordered by their appearance in the template.
   */
  parse(template: string): VariableToken[] {
    const tokens: VariableToken[] = [];

    // Create a fresh regex instance per call so that lastIndex is always 0
    // and concurrent callers cannot interfere with each other.
    const TOKEN_PATTERN = createTokenPattern();

    let match: RegExpExecArray | null;
    while ((match = TOKEN_PATTERN.exec(template)) !== null) {
      const raw = match[0];
      const expression = match[1].trim();

      // Skip empty `${}` placeholders – they carry no information.
      if (expression.length === 0) {
        continue;
      }

      tokens.push({
        raw,
        expression,
        offset: match.index
      });
    }

    return tokens;
  }
}

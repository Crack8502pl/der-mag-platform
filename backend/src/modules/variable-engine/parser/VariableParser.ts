/**
 * Variable Engine – VariableParser
 *
 * Responsible for extracting `${...}` placeholders from a template string.
 * Implements `IVariableParser` (see contracts).
 *
 * Design decisions (post-PR-10 hardening, L-02 + L-06):
 * - Uses a **stack-based** character-by-character scan instead of a simple
 *   regex so that:
 *     1. Nested `${...}` expressions (`${fn(${inner})}`) are correctly
 *        identified as a single token.           (L-02)
 *     2. A literal `}` inside an expression does not terminate the token
 *        prematurely (`${obj.method({key:"v"})}` is parsed correctly).
 *                                                (L-06)
 * - The brace-depth counter increments on every `{` and decrements on every
 *   `}`.  The token ends when the depth returns to zero.
 * - Whitespace inside the expression is trimmed before the token is emitted.
 * - Empty expressions `${}` are skipped (no token emitted).
 */

import type { IVariableParser, VariableToken } from '../contracts';

export class VariableParser implements IVariableParser {
  /**
   * Extract all `${...}` tokens from `template`.
   *
   * Correctly handles:
   * - Nested `${...}` sub-expressions (`${fn(${inner})}`)
   * - Literal `}` characters inside the placeholder (`${obj.fn({a:1})}`)
   *
   * @param template – Any string that may contain `${expression}` placeholders.
   * @returns Array of tokens ordered by their appearance in the template.
   */
  parse(template: string): VariableToken[] {
    const tokens: VariableToken[] = [];
    const len = template.length;
    let i = 0;

    while (i < len) {
      // Look for the start of a placeholder: `${`
      if (template[i] === '$' && i + 1 < len && template[i + 1] === '{') {
        const tokenStart = i;   // position of `$`
        let depth = 1;          // we've entered the first `{`
        i += 2;                 // advance past `${`

        // Walk forward, tracking brace depth.
        while (i < len && depth > 0) {
          const ch = template[i];
          if (ch === '{') {
            depth++;
          } else if (ch === '}') {
            depth--;
          }
          i++;
        }

        // `depth === 0` means we found the matching `}`.
        // If depth > 0 the placeholder was never closed; skip it.
        if (depth === 0) {
          // The full matched text (e.g. `${camera.total}`) is
          // template[tokenStart .. i-1].
          const raw = template.slice(tokenStart, i);
          // The expression is everything between the opening `${` (2 chars)
          // and the last `}` (1 char from the end).
          const OPEN_DELIMITER_LEN = 2; // length of `${`
          const expression = raw.slice(OPEN_DELIMITER_LEN, raw.length - 1).trim();

          if (expression.length > 0) {
            tokens.push({ raw, expression, offset: tokenStart });
          }
        }
      } else {
        i++;
      }
    }

    return tokens;
  }
}

/**
 * Variable Engine – VariableEvaluator
 *
 * Top-level orchestrator that performs the full parse → resolve → render
 * pipeline for a template string.
 *
 * Algorithm:
 * 1. Parse the template for `${...}` tokens.
 * 2. Resolve each unique expression (deduplication avoids redundant provider
 *    calls when the same variable appears multiple times).
 * 3. Build a replacement map: `raw → resolvedString`.
 * 4. Walk through the template once and substitute every token.
 *
 * A token that resolves to `undefined` (provider returned nothing) is replaced
 * with `options.fallback` (default `''`) so the rendered string is always
 * well-formed.
 *
 * The evaluator itself never throws.  Individual resolution failures are
 * handled inside `VariableResolver` (soft-fail).
 */

import type {
  IVariableEvaluator,
  IVariableParser,
  IVariableResolver,
  VariableContext,
  EvaluateOptions,
  VariableValue
} from '../contracts';

/** Coerce a resolved value to its string representation. */
function toDisplayString(value: VariableValue, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

export class VariableEvaluator implements IVariableEvaluator {
  private readonly parser: IVariableParser;
  private readonly resolver: IVariableResolver;

  constructor(parser: IVariableParser, resolver: IVariableResolver) {
    this.parser = parser;
    this.resolver = resolver;
  }

  async evaluate(
    template: string,
    context: VariableContext,
    options: EvaluateOptions = {}
  ): Promise<string> {
    const fallback = options.fallback ?? '';

    // ── 1. Parse ──────────────────────────────────────────────────────────────
    const tokens = this.parser.parse(template);
    if (tokens.length === 0) {
      return template;
    }

    // ── 2. Resolve unique expressions (deduplication) ─────────────────────────
    const uniqueExpressions = [...new Set(tokens.map((t) => t.expression))];
    const resolvedMap = new Map<string, VariableValue>();

    await Promise.all(
      uniqueExpressions.map(async (expr) => {
        const value = await this.resolver.resolve(expr, context);
        resolvedMap.set(expr, value);
      })
    );

    // ── 3 & 4. Substitute tokens in the original string ───────────────────────
    // Replace from right-to-left (by offset descending) so that character
    // offsets remain valid after each substitution when string lengths differ.
    const sortedByOffsetDesc = [...tokens].sort((a, b) => b.offset - a.offset);

    let result = template;
    for (const token of sortedByOffsetDesc) {
      const value = resolvedMap.get(token.expression);
      const replacement = toDisplayString(value, fallback);
      result =
        result.slice(0, token.offset) +
        replacement +
        result.slice(token.offset + token.raw.length);
    }

    return result;
  }
}

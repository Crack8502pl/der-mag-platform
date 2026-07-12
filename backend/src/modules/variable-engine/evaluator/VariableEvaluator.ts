/**
 * Variable Engine – VariableEvaluator (post-PR-10 hardening)
 *
 * Top-level orchestrator that performs the full parse → resolve → render
 * pipeline for a template string.
 *
 * Algorithm:
 * 1. Parse the template for `${...}` tokens (stack-based parser handles
 *    nested braces, L-02 + L-06).
 * 2. Resolve each unique expression (deduplication avoids redundant provider
 *    calls when the same variable appears multiple times).
 * 3. Build a replacement map: `raw → resolvedString`.
 * 4. Walk through the template once and substitute every token.
 *
 * ## Fallback policy
 *
 * A token that resolves to `undefined` is replaced according to the
 * configured `FallbackMode`:
 * - `EMPTY` (default) – replaced with `''` so the rendered string is
 *   always well-formed.
 * - `PRESERVE` – the original `${expression}` placeholder is kept as-is,
 *   useful for debugging or two-pass rendering.
 * - `CUSTOM` – replaced with the static string from `options.fallback`.
 *
 * ## Strict mode (L-04 / L-17)
 *
 * When `undefinedPolicy: UndefinedPolicy.STRICT` is set in `EvaluateOptions`,
 * any expression that resolves to `undefined` causes the evaluator to throw
 * `VariableResolutionError`.  This propagates from the resolver naturally.
 *
 * The evaluator itself never throws in soft-fail mode.  Individual resolution
 * failures are handled inside `VariableResolver` (soft-fail).
 */

import type {
  IVariableEvaluator,
  IVariableParser,
  IVariableLogger,
  VariableContext,
  EvaluateOptions,
  VariableValue,
  VariableToken
} from '../contracts';
import { FallbackMode, UndefinedPolicy } from '../contracts';
import { NullVariableLogger } from '../logger';
import type { IVariableResolver } from '../contracts';

/** Coerce a resolved value to its string representation. */
function toDisplayString(value: VariableValue, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

/** Determine the replacement string for an unresolved token. */
function applyFallbackPolicy(token: VariableToken, options: EvaluateOptions): string {
  // When fallbackMode is not set, maintain backward-compatible behaviour:
  // the `fallback` string (defaulting to '') is used directly.
  if (options.fallbackMode === undefined) {
    return options.fallback ?? '';
  }
  switch (options.fallbackMode) {
    case FallbackMode.PRESERVE:
      return token.raw;
    case FallbackMode.CUSTOM:
      return options.fallback ?? '';
    case FallbackMode.EMPTY:
      return '';
  }
}

export class VariableEvaluator implements IVariableEvaluator {
  private readonly parser: IVariableParser;
  private readonly resolver: IVariableResolver;
  private readonly logger: IVariableLogger;

  constructor(
    parser: IVariableParser,
    resolver: IVariableResolver,
    logger?: IVariableLogger
  ) {
    this.parser = parser;
    this.resolver = resolver;
    this.logger = logger ?? new NullVariableLogger();
  }

  async evaluate(
    template: string,
    context: VariableContext,
    options: EvaluateOptions = {}
  ): Promise<string> {
    const fallback = options.fallback ?? '';
    const isStrict = options.undefinedPolicy === UndefinedPolicy.STRICT;

    // ── 1. Parse ──────────────────────────────────────────────────────────────
    const tokens = this.parser.parse(template);
    if (tokens.length === 0) {
      return template;
    }

    this.logger.trace('Evaluating template', { tokenCount: tokens.length });

    // ── 2. Resolve unique expressions (deduplication) ─────────────────────────
    const uniqueExpressions = [...new Set(tokens.map((t) => t.expression))];
    const resolvedMap = new Map<string, VariableValue>();

    // In strict mode, let resolver errors propagate out of Promise.all.
    // In soft-fail mode, resolver never throws so no special handling is needed.
    await Promise.all(
      uniqueExpressions.map(async (expr) => {
        const value = await this.resolver.resolve(expr, context);
        resolvedMap.set(expr, value);
        if (value === undefined && !isStrict) {
          this.logger.trace('Expression resolved to undefined – fallback will apply', {
            expression: expr,
            fallbackMode: options.fallbackMode ?? 'default',
          });
        }
      })
    );

    // ── 3 & 4. Substitute tokens in the original string ───────────────────────
    // Replace from right-to-left (by offset descending) so that character
    // offsets remain valid after each substitution when string lengths differ.
    const sortedByOffsetDesc = [...tokens].sort((a, b) => b.offset - a.offset);

    let result = template;
    for (const token of sortedByOffsetDesc) {
      const value = resolvedMap.get(token.expression);
      const replacement =
        value === undefined || value === null
          ? applyFallbackPolicy(token, options)
          : toDisplayString(value, fallback);
      result =
        result.slice(0, token.offset) +
        replacement +
        result.slice(token.offset + token.raw.length);
    }

    return result;
  }
}


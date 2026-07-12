/**
 * Variable Engine – VariableResolver (post-PR-10 hardening)
 *
 * Resolves a single variable expression to its runtime value by:
 * 1. Checking the cache (unless `bypassCache` is set).
 * 2. Resolving any nested `${...}` sub-expressions inside the expression
 *    before further processing (L-02).
 * 3. Detecting whether the expression is a function call (PR-8 + L-20/L-21).
 *    When a function call is detected and the function is registered the
 *    argument expressions are resolved recursively and the function applied.
 *    Multi-argument calls are supported via `IVariableFunction.callMulti`
 *    (L-21).
 * 4. Finding the matching provider in the registry.
 * 5. Calling `provider.resolve(expression, context)`.
 * 6. Storing the result in the cache.
 * 7. Returning the result (or `undefined` / throwing on soft/strict-fail).
 *
 * ## Strict mode (L-04 / L-17)
 *
 * When `strictMode: true` is set in `ResolverOptions`, the resolver throws
 * `VariableResolutionError` for any expression that resolves to `undefined`
 * instead of returning `undefined` silently.  This is useful in development
 * or for templates where every variable must be present.
 *
 * ## Monotonic clock (L-26)
 *
 * `performance.now()` (monotonic) is used instead of `Date.now()` (wall
 * clock) for `durationMs` measurements so that clock adjustments do not
 * produce negative durations.
 *
 * The resolver never throws in soft-fail mode.  All provider errors are
 * caught and forwarded to the injected `IVariableLogger`.
 */

import { performance } from 'perf_hooks';
import type {
  IVariableResolver,
  IVariableRegistry,
  IVariableCache,
  IVariableLogger,
  IFunctionRegistry,
  VariableContext,
  VariableValue
} from '../contracts';
import { NullVariableLogger } from '../logger';
import { VariableResolutionError } from '../errors';
import { parseFunctionCall } from '../functions/parseFunctionCall';
import { VariableParser } from '../parser/VariableParser';

/** Build the cache key for a given expression + context. */
function buildCacheKey(expression: string, context: VariableContext): string {
  const entityPart =
    context.entityId !== undefined ? `${context.entityType ?? ''}:${context.entityId}` : '';
  return entityPart ? `${entityPart}|${expression}` : expression;
}

export interface ResolverOptions {
  /** When true, skip cache reads and writes for every resolution. */
  readonly bypassCache?: boolean;

  /**
   * Structured logger for resolution events.
   * Defaults to a no-op logger when not supplied.
   */
  readonly logger?: IVariableLogger;

  /**
   * Optional function registry used to evaluate function-call expressions
   * such as `count(children)` or `round(fiber.length.total)`.
   *
   * When omitted, function-call expressions are treated as plain variable
   * expressions (which will typically resolve to `undefined` because no
   * provider claims a namespace that includes parentheses).
   *
   * Injected by `VariableEngineFactory` automatically when the built-in
   * function registry is enabled (PR-8).
   */
  readonly functionRegistry?: IFunctionRegistry;

  /**
   * When `true`, the resolver throws `VariableResolutionError` for any
   * expression that resolves to `undefined` (L-04/L-17 strict mode).
   *
   * Default: `false` (soft-fail – unresolved expressions return `undefined`).
   */
  readonly strictMode?: boolean;
}

// Internal parser used to detect and resolve nested `${...}` sub-expressions.
const _nestedParser = new VariableParser();

export class VariableResolver implements IVariableResolver {
  private readonly registry: IVariableRegistry;
  private readonly cache: IVariableCache;
  private readonly options: ResolverOptions;
  private readonly logger: IVariableLogger;
  private readonly functionRegistry: IFunctionRegistry | undefined;
  private readonly strictMode: boolean;

  constructor(
    registry: IVariableRegistry,
    cache: IVariableCache,
    options: ResolverOptions = {}
  ) {
    this.registry = registry;
    this.cache = cache;
    this.options = options;
    this.logger = options.logger ?? new NullVariableLogger();
    this.functionRegistry = options.functionRegistry;
    this.strictMode = options.strictMode === true;
  }

  async resolve(expression: string, context: VariableContext): Promise<VariableValue> {
    const cacheKey = buildCacheKey(expression, context);
    const bypass = this.options.bypassCache === true;
    const startNs = performance.now(); // monotonic clock (L-26)

    // ── 1. Cache hit ──────────────────────────────────────────────────────────
    if (!bypass) {
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        this.logger.trace('Cache hit', { expression });
        return cached;
      }
    }

    // ── 2. Resolve nested ${...} sub-expressions inside the expression (L-02) ─
    //
    // If the expression itself contains `${inner}` patterns (e.g. from a
    // nested expression like `fn(${inner})`), resolve those first and
    // substitute their values before continuing.
    let resolvedExpression = expression;
    const nestedTokens = _nestedParser.parse(expression);
    if (nestedTokens.length > 0) {
      // Walk tokens right-to-left to preserve character offsets after substitution.
      const sortedDesc = [...nestedTokens].sort((a, b) => b.offset - a.offset);
      for (const token of sortedDesc) {
        const innerValue = await this.resolve(token.expression, context);
        const replacement =
          innerValue === undefined || innerValue === null ? '' : String(innerValue);
        resolvedExpression =
          resolvedExpression.slice(0, token.offset) +
          replacement +
          resolvedExpression.slice(token.offset + token.raw.length);
      }
      this.logger.trace('Nested expressions resolved', {
        original: expression,
        resolved: resolvedExpression,
      });
    }

    // ── 3. Function call detection (PR-8, L-20/L-21) ──────────────────────────
    if (this.functionRegistry !== undefined) {
      const funcCall = parseFunctionCall(resolvedExpression);
      if (funcCall !== null) {
        const fn = this.functionRegistry.find(funcCall.funcName);
        if (fn !== undefined) {
          this.logger.trace('Function call detected', {
            expression: resolvedExpression,
            funcName: funcCall.funcName,
            argExpressions: funcCall.argExpressions,
          });

          // Resolve all argument expressions in parallel (L-21).
          const argValues = await Promise.all(
            funcCall.argExpressions.map((argExpr) => this.resolve(argExpr, context))
          );

          // Invoke `callMulti` when present and multiple args; fall back to `call`.
          let result: VariableValue;
          if (typeof fn.callMulti === 'function' && argValues.length !== 1) {
            result = fn.callMulti(argValues);
          } else {
            result = fn.call(argValues[0]);
          }

          // Cache the function result under the full expression key.
          if (!bypass && result !== undefined) {
            this.cache.set(cacheKey, result);
          }

          return this.applyStrictCheck(result, expression);
        }
        // Function name is not registered – log a warning and soft-fail.
        this.logger.warn('Unknown function in expression – soft-fail applied', {
          expression: resolvedExpression,
          funcName: funcCall.funcName,
        });
        return this.applyStrictCheck(undefined, expression);
      }
    }

    // ── 4. Find provider ──────────────────────────────────────────────────────
    const provider = this.registry.find(resolvedExpression);
    if (!provider) {
      this.logger.trace('No provider found', { expression: resolvedExpression });
      return this.applyStrictCheck(undefined, expression);
    }

    // ── 5. Invoke provider (soft-fail) ────────────────────────────────────────
    let value: VariableValue;
    try {
      value = await provider.resolve(resolvedExpression, context);
      const durationMs = performance.now() - startNs;
      this.logger.trace('Provider resolved', {
        expression: resolvedExpression,
        provider: provider.constructor.name,
        durationMs,
      });
    } catch (err) {
      const meta: Record<string, unknown> = {
        expression: resolvedExpression,
        provider: provider.constructor.name,
      };
      if (err instanceof Error) {
        meta.errorName = err.name;
        meta.errorMessage = err.message;
        meta.stack = err.stack;
      }
      this.logger.error('Provider threw during resolution – soft-fail applied', meta);
      return this.applyStrictCheck(undefined, expression);
    }

    // ── 6. Store in cache ─────────────────────────────────────────────────────
    if (!bypass && value !== undefined) {
      this.cache.set(cacheKey, value);
    }

    return this.applyStrictCheck(value, expression);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * In strict mode, throw when the value is `undefined`.
   * In soft-fail mode, return the value unchanged.
   */
  private applyStrictCheck(value: VariableValue, expression: string): VariableValue {
    if (this.strictMode && value === undefined) {
      throw new VariableResolutionError(expression, 'expression resolved to undefined (strict mode)');
    }
    return value;
  }
}


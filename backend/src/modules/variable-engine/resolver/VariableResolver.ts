/**
 * Variable Engine – VariableResolver
 *
 * Resolves a single variable expression to its runtime value by:
 * 1. Checking the cache (unless `bypassCache` is set).
 * 2. Finding the matching provider in the registry.
 * 3. Calling `provider.resolve(expression, context)`.
 * 4. Storing the result in the cache.
 * 5. Returning the result (or `undefined` on soft-fail).
 *
 * The resolver never throws.  All provider errors are caught and forwarded
 * to the injected `IVariableLogger` so that a broken provider does not crash
 * the evaluation of a whole template.  Stack traces are stripped from the
 * log payload unless the logger was configured for dev/trace mode, preventing
 * internal implementation details from leaking into production logs.
 */

import type {
  IVariableResolver,
  IVariableRegistry,
  IVariableCache,
  IVariableLogger,
  VariableContext,
  VariableValue
} from '../contracts';
import { NullVariableLogger } from '../logger';

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
}

export class VariableResolver implements IVariableResolver {
  private readonly registry: IVariableRegistry;
  private readonly cache: IVariableCache;
  private readonly options: ResolverOptions;
  private readonly logger: IVariableLogger;

  constructor(
    registry: IVariableRegistry,
    cache: IVariableCache,
    options: ResolverOptions = {}
  ) {
    this.registry = registry;
    this.cache = cache;
    this.options = options;
    this.logger = options.logger ?? new NullVariableLogger();
  }

  async resolve(expression: string, context: VariableContext): Promise<VariableValue> {
    const cacheKey = buildCacheKey(expression, context);
    const bypass = this.options.bypassCache === true;

    // ── 1. Cache hit ──────────────────────────────────────────────────────────
    if (!bypass) {
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        this.logger.trace('Cache hit', { expression });
        return cached;
      }
    }

    // ── 2. Find provider ──────────────────────────────────────────────────────
    const provider = this.registry.find(expression);
    if (!provider) {
      this.logger.trace('No provider found', { expression });
      return undefined;
    }

    // ── 3. Invoke provider (soft-fail) ────────────────────────────────────────
    let value: VariableValue;
    try {
      value = await provider.resolve(expression, context);
      this.logger.trace('Provider resolved', { expression, provider: provider.constructor.name });
    } catch (err) {
      // Providers must not crash the engine – log structured error and return
      // undefined.  Stack trace is intentionally excluded from the meta
      // payload; the logger decides whether to include it based on its own
      // configuration (e.g. includeStackTrace=true only in dev mode).
      const meta: Record<string, unknown> = {
        expression,
        provider: provider.constructor.name,
      };
      if (err instanceof Error) {
        meta.errorName = err.name;
        meta.errorMessage = err.message;
        meta.stack = err.stack;
      }
      this.logger.error('Provider threw during resolution – soft-fail applied', meta);
      return undefined;
    }

    // ── 4. Store in cache ─────────────────────────────────────────────────────
    if (!bypass && value !== undefined) {
      this.cache.set(cacheKey, value);
    }

    return value;
  }
}


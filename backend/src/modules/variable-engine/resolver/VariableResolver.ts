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
 * The resolver never throws.  All provider errors are caught and logged so
 * that a broken provider does not crash the evaluation of a whole template.
 */

import type {
  IVariableResolver,
  IVariableRegistry,
  IVariableCache,
  VariableContext,
  VariableValue
} from '../contracts';

/** Build the cache key for a given expression + context. */
function buildCacheKey(expression: string, context: VariableContext): string {
  const entityPart =
    context.entityId !== undefined ? `${context.entityType ?? ''}:${context.entityId}` : '';
  return entityPart ? `${entityPart}|${expression}` : expression;
}

export interface ResolverOptions {
  /** When true, skip cache reads and writes for every resolution. */
  readonly bypassCache?: boolean;
}

export class VariableResolver implements IVariableResolver {
  private readonly registry: IVariableRegistry;
  private readonly cache: IVariableCache;
  private readonly options: ResolverOptions;

  constructor(
    registry: IVariableRegistry,
    cache: IVariableCache,
    options: ResolverOptions = {}
  ) {
    this.registry = registry;
    this.cache = cache;
    this.options = options;
  }

  async resolve(expression: string, context: VariableContext): Promise<VariableValue> {
    const cacheKey = buildCacheKey(expression, context);
    const bypass = this.options.bypassCache === true;

    // ── 1. Cache hit ──────────────────────────────────────────────────────────
    if (!bypass) {
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // ── 2. Find provider ──────────────────────────────────────────────────────
    const provider = this.registry.find(expression);
    if (!provider) {
      return undefined;
    }

    // ── 3. Invoke provider (soft-fail) ────────────────────────────────────────
    let value: VariableValue;
    try {
      value = await provider.resolve(expression, context);
    } catch (err) {
      // Providers must not crash the engine – log and return undefined.
      console.error(
        `[VariableResolver] provider "${provider.constructor.name}" threw for expression ` +
          `"${expression}":`,
        err
      );
      return undefined;
    }

    // ── 4. Store in cache ─────────────────────────────────────────────────────
    if (!bypass && value !== undefined) {
      this.cache.set(cacheKey, value);
    }

    return value;
  }
}

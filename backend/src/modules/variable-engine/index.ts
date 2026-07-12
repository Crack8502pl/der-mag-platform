/**
 * Variable Engine – public API
 *
 * This barrel file re-exports everything a consumer needs.  Internal
 * implementation details (e.g. `buildCacheKey`) are deliberately NOT
 * exported here.
 *
 * Typical usage:
 *
 * ```ts
 * import {
 *   VariableParser,
 *   VariableRegistry,
 *   VariableResolver,
 *   VariableEvaluator,
 *   L1VariableCache,
 * } from '@/modules/variable-engine';
 *
 * const cache    = new L1VariableCache();
 * const parser   = new VariableParser();
 * const registry = new VariableRegistry();
 * const resolver = new VariableResolver(registry, cache);
 * const engine   = new VariableEvaluator(parser, resolver);
 *
 * // Register a provider (injected via DI in production):
 * registry.register(myCameraProvider);
 *
 * const result = await engine.evaluate('Total cameras: ${camera.total}', ctx);
 * ```
 */

// ─── Contracts ────────────────────────────────────────────────────────────────
export type {
  VariableValue,
  VariableContext,
  VariableToken,
  IVariableProvider,
  IVariableRegistry,
  IVariableCache,
  IVariableParser,
  IVariableResolver,
  IVariableEvaluator,
  EvaluateOptions
} from './contracts';

// ─── Errors ───────────────────────────────────────────────────────────────────
export {
  VariableEngineError,
  VariableParseError,
  NamespaceConflictError,
  VariableResolutionError
} from './errors';

// ─── Implementations ──────────────────────────────────────────────────────────
export { VariableParser } from './parser';
export { VariableRegistry } from './registry';
export type { RegistryOptions } from './registry';
export { L1VariableCache } from './cache';
export type { L1CacheOptions } from './cache';
export { VariableResolver } from './resolver';
export type { ResolverOptions } from './resolver';
export { VariableEvaluator } from './evaluator';

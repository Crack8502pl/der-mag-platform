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
  IL2VariableCache,
  IVariableParser,
  IVariableResolver,
  IVariableEvaluator,
  IVariableLogger,
  EvaluateOptions,
  IVariableFunction,
  IFunctionRegistry,
  FunctionCallExpression
} from './contracts';
export { FallbackMode, UndefinedPolicy } from './contracts';

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
export type { RegistryOptions, OverwritePolicy } from './registry';
export { L1VariableCache } from './cache';
export type { L1CacheOptions } from './cache';
export { NullL2VariableCache } from './cache';
export { CompositeVariableCache } from './cache';
export type { CompositeVariableCacheOptions } from './cache';
export { VariableResolver } from './resolver';
export type { ResolverOptions } from './resolver';
export { VariableEvaluator } from './evaluator';

// ─── Logger (PR-7) ────────────────────────────────────────────────────────────
export { VariableEngineLogger, NullVariableLogger } from './logger';
export type { VariableEngineLoggerOptions } from './logger';

// ─── Provider base class (PR-2) ───────────────────────────────────────────────
export { AbstractVariableProvider } from './providers';

// ─── Hierarchy providers (PR-4) ───────────────────────────────────────────────
export { HierarchyVariableProvider, TaskRelationshipTraversalService } from './providers';
export type { IHierarchyTraversalService, HierarchyNode, ITaskRelationshipRepository } from './providers';

// ─── CCTV/Network/Fiber/IP providers (PR-5) ──────────────────────────────────
export { CameraVariableProvider } from './providers';
export type { ICameraDataService, CameraData } from './providers';

export { SwitchVariableProvider } from './providers';
export type { ISwitchDataService, SwitchData } from './providers';

export { FiberVariableProvider } from './providers';
export type { IFiberDataService, FiberData } from './providers';

export { IpVariableProvider } from './providers';
export type { IIpDataService, IpData } from './providers';

// ─── Function Registry (PR-8) ─────────────────────────────────────────────────
export { FunctionRegistry, parseFunctionCall, createBuiltinFunctionRegistry } from './functions';
export { CountFunction, RoundFunction, UppercaseFunction } from './functions';

// ─── Factory / DI wiring (PR-2) ───────────────────────────────────────────────
export { VariableEngineFactory } from './factory';
export type { VariableEngineFactoryOptions, VariableEngineInstance, VariableEngineFactoryCacheOptions } from './factory';

// ─── Template Integration Adapters + Feature Flags ───────────────────────────
export {
  LegacyVariableResolver,
  BomTemplateRenderingAdapter,
  PdfTemplateRenderingAdapter,
  ReportsTemplateRenderingAdapter,
  LabelsTemplateRenderingAdapter,
  EmailsTemplateRenderingAdapter,
} from './adapter';
export type {
  BomRenderContext,
  LegacyVariableValue,
  PdfRenderContext,
  ReportsRenderContext,
  LabelsRenderContext,
  EmailsRenderContext,
} from './adapter';
export { readFeatureFlags } from './config';
export type { FeatureFlags } from './config';


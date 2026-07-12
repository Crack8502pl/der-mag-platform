/**
 * Variable Engine – VariableEngineFactory (post-PR-10 hardening)
 *
 * A factory that wires all Variable Engine components together and
 * **auto-registers** every injected provider into the `VariableRegistry`.
 *
 * ## Purpose (PR-2 scope)
 *
 * `VariableEngineFactory` is the DI entry point for the Variable Engine.
 * Callers supply a list of `IVariableProvider` instances (injected via the
 * application's DI container) and receive a fully configured `IVariableEvaluator`
 * together with the underlying `VariableRegistry` for diagnostics.
 *
 * Adding a new provider domain (e.g. `camera`, `fiber`, `contract`) requires
 * **no changes to core engine code** – only the DI provider list grows.
 * This satisfies the Open/Closed Principle (OCP) mandated by the roadmap.
 *
 * ## Async provider initialisation (L-07)
 *
 * `createAsync()` awaits each provider's optional `initialize()` method in
 * **registration order** before returning the engine instance.  Use this
 * instead of `create()` when any provider performs async setup (e.g. DB
 * schema loading, remote config fetch).
 *
 * ## Rollback safety (L-10)
 *
 * Provider registration is delegated to `VariableRegistry.registerAll()`
 * which rolls back all registrations atomically if any provider causes a
 * conflict error.
 *
 * ## Conflict policy (L-08)
 *
 * By default the registry runs in **strict mode** (`overwritePolicy: 'error'`):
 * registering two providers for the same namespace throws a
 * `NamespaceConflictError`.  Pass `{ registry: { overwritePolicy: 'warn' } }`
 * or `{ registry: { overwritePolicy: 'overwrite' } }` to relax this.
 *
 * ## L2 cache (L-01)
 *
 * Supply an `IL2VariableCache` implementation via `options.cache.l2` to
 * enable the composite L1+L2 cache.  When omitted, only the in-process L1
 * cache is used.
 *
 * ## Typical usage (DI wiring)
 *
 * ```ts
 * import { VariableEngineFactory } from '@/modules/variable-engine';
 *
 * const factory = new VariableEngineFactory(
 *   [cameraProvider, fiberProvider, contractProvider],
 *   { cache: { maxSize: 500, defaultTtlMs: 30_000 } }
 * );
 *
 * // Synchronous (no async init):
 * const { engine, registry } = factory.create();
 *
 * // Async (runs initialize() on every provider in order):
 * const { engine, registry } = await factory.createAsync();
 *
 * const result = await engine.evaluate(template, context);
 * ```
 */

import type { IVariableProvider, IVariableEvaluator, IL2VariableCache } from '../contracts';
import { VariableRegistry } from '../registry';
import { L1VariableCache, CompositeVariableCache, NullL2VariableCache } from '../cache';
import { VariableParser } from '../parser';
import { VariableResolver } from '../resolver';
import { VariableEvaluator } from '../evaluator';
import { createBuiltinFunctionRegistry } from '../functions';
import type { RegistryOptions } from '../registry';
import type { L1CacheOptions } from '../cache';
import type { ResolverOptions } from '../resolver';
import type { IVariableLogger } from '../contracts';

// ─── Options ──────────────────────────────────────────────────────────────────

export interface VariableEngineFactoryCacheOptions extends L1CacheOptions {
  /**
   * Optional L2 cache implementation (L-01).
   * When omitted, a no-op `NullL2VariableCache` is used.
   */
  readonly l2?: IL2VariableCache;

  /**
   * TTL for L2 cache entries in milliseconds.  `0` means no TTL.
   * Only used when `l2` is provided.
   * @default 0
   */
  readonly l2TtlMs?: number;
}

export interface VariableEngineFactoryOptions {
  /** Options forwarded to `VariableRegistry`. */
  readonly registry?: RegistryOptions;
  /** Options forwarded to the cache tier. */
  readonly cache?: VariableEngineFactoryCacheOptions;
  /** Options forwarded to `VariableResolver`. */
  readonly resolver?: ResolverOptions;
  /** Logger used by the registry for warn-mode conflict messages. */
  readonly logger?: IVariableLogger;
}

// ─── Result ───────────────────────────────────────────────────────────────────

export interface VariableEngineInstance {
  /** Fully wired evaluator ready to process template strings. */
  readonly engine: IVariableEvaluator;
  /**
   * The underlying registry.  Exposed for diagnostics (e.g. listing all
   * active providers).  Callers should not register additional providers
   * outside of the factory unless they explicitly need dynamic registration.
   */
  readonly registry: VariableRegistry;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export class VariableEngineFactory {
  private readonly providers: ReadonlyArray<IVariableProvider>;
  private readonly options: VariableEngineFactoryOptions;

  /**
   * @param providers – Flat list of providers to auto-register.  Supplied by
   *                    the DI container; the order of registration follows the
   *                    array order.
   * @param options   – Optional configuration overrides for sub-components.
   */
  constructor(
    providers: ReadonlyArray<IVariableProvider>,
    options: VariableEngineFactoryOptions = {}
  ) {
    this.providers = providers;
    this.options = options;
  }

  /**
   * Assemble a fully wired Variable Engine instance (synchronous).
   *
   * Does NOT run provider `initialize()` hooks.  Use `createAsync()` if any
   * provider requires async initialisation (L-07).
   *
   * Each call returns a **new** independent instance; the factory itself is
   * stateless and can be called multiple times (useful for tests).
   *
   * @throws {NamespaceConflictError} if two providers claim the same namespace
   *         and strict mode is active (the default).
   */
  create(): VariableEngineInstance {
    const registry = this.buildRegistry();
    const engine = this.buildEngine(registry);
    return { engine, registry };
  }

  /**
   * Assemble a fully wired Variable Engine instance, running each provider's
   * optional `initialize()` method in **registration order** before returning
   * (L-07).
   *
   * Use this instead of `create()` whenever a provider depends on async setup
   * (e.g. DB connection warm-up, remote config fetch).
   *
   * @throws {NamespaceConflictError} if two providers claim the same namespace
   *         and strict mode is active (the default).
   */
  async createAsync(): Promise<VariableEngineInstance> {
    const registry = this.buildRegistry();

    // Run initialize() in registration order (L-07).
    for (const provider of this.providers) {
      if (typeof provider.initialize === 'function') {
        await provider.initialize();
      }
    }

    const engine = this.buildEngine(registry);
    return { engine, registry };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private buildRegistry(): VariableRegistry {
    const registryOptions = this.options.registry ?? {};
    // Inject factory-level logger into registry for warn-mode messages.
    const registryWithLogger: RegistryOptions = this.options.logger
      ? { ...registryOptions, logger: this.options.logger }
      : registryOptions;

    const registry = new VariableRegistry(registryWithLogger);
    // Use registerAll for atomic rollback safety (L-10).
    registry.registerAll(this.providers);
    return registry;
  }

  private buildEngine(registry: VariableRegistry): IVariableEvaluator {
    const cacheOptions = this.options.cache;

    // Build L1 cache.
    const l1 = new L1VariableCache({
      maxSize: cacheOptions?.maxSize,
      defaultTtlMs: cacheOptions?.defaultTtlMs,
    });

    // Build composite cache if L2 is provided (L-01).
    const l2 = cacheOptions?.l2 ?? new NullL2VariableCache();
    const cache = new CompositeVariableCache(l1, l2, {
      l2TtlMs: cacheOptions?.l2TtlMs,
      logger: this.options.logger,
    });

    const parser = new VariableParser();

    // Wire built-in function registry unless the caller provided a custom one.
    const resolverOptions: ResolverOptions = {
      ...this.options.resolver,
      functionRegistry:
        this.options.resolver?.functionRegistry ?? createBuiltinFunctionRegistry(),
    };

    const resolver = new VariableResolver(registry, cache, resolverOptions);
    return new VariableEvaluator(parser, resolver);
  }
}

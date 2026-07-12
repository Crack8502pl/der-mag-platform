/**
 * Variable Engine – VariableEngineFactory
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
 * ## Conflict policy
 *
 * By default the registry runs in **strict mode**: registering two providers
 * for the same namespace throws a `NamespaceConflictError`.  Pass
 * `{ registry: { overwrite: true } }` in `options` to use last-write-wins
 * semantics instead.
 *
 * ## Typical usage (DI wiring)
 *
 * ```ts
 * import { VariableEngineFactory } from '@/modules/variable-engine';
 *
 * // In your DI container initialiser – providers are injected automatically:
 * const factory = new VariableEngineFactory(
 *   [cameraProvider, fiberProvider, contractProvider],
 *   { cache: { maxSize: 500 } }
 * );
 *
 * const { engine, registry } = factory.create();
 *
 * // engine is ready; no manual registry.register() calls needed.
 * const result = await engine.evaluate(template, context);
 * ```
 */

import type { IVariableProvider, IVariableEvaluator } from '../contracts';
import { VariableRegistry } from '../registry';
import { L1VariableCache } from '../cache';
import { VariableParser } from '../parser';
import { VariableResolver } from '../resolver';
import { VariableEvaluator } from '../evaluator';
import type { RegistryOptions } from '../registry';
import type { L1CacheOptions } from '../cache';
import type { ResolverOptions } from '../resolver';

// ─── Options ──────────────────────────────────────────────────────────────────

export interface VariableEngineFactoryOptions {
  /** Options forwarded to `VariableRegistry`. */
  readonly registry?: RegistryOptions;
  /** Options forwarded to `L1VariableCache`. */
  readonly cache?: L1CacheOptions;
  /** Options forwarded to `VariableResolver`. */
  readonly resolver?: ResolverOptions;
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
   * Assemble a fully wired Variable Engine instance.
   *
   * Each call returns a **new** independent instance; the factory itself is
   * stateless and can be called multiple times (useful for tests).
   *
   * @throws {NamespaceConflictError} if two providers claim the same namespace
   *         and strict mode is active (the default).
   */
  create(): VariableEngineInstance {
    const cache = new L1VariableCache(this.options.cache);
    const parser = new VariableParser();
    const registry = new VariableRegistry(this.options.registry);

    // Auto-register all injected providers – OCP: no switch-case, no core change.
    for (const provider of this.providers) {
      registry.register(provider);
    }

    const resolver = new VariableResolver(registry, cache, this.options.resolver);
    const engine = new VariableEvaluator(parser, resolver);

    return { engine, registry };
  }
}

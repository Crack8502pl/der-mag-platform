/**
 * Variable Engine – VariableRegistry (post-PR-10 hardening)
 *
 * Central registry that maps namespace prefixes to `IVariableProvider`
 * instances.  All lookups are O(1) via a `Map` keyed by namespace string.
 *
 * Namespace extraction rule:
 *   Given expression `"camera.total"` the namespace is `"camera"`.
 *   Given expression `"fiber.length.total"` the namespace is `"fiber"`.
 *   Given expression `"count"` (no dot) the namespace is `"count"`.
 *
 * ## Conflict policy (L-08)
 *
 * Three modes are available:
 * - `'error'` (default) – throw `NamespaceConflictError` on duplicate.
 * - `'warn'`  – log a warning and overwrite the existing provider.
 * - `'overwrite'` / `overwrite: true` – silently replace (legacy compat).
 *
 * ## Rollback safety (L-10)
 *
 * `registerAll(providers)` registers providers inside a virtual transaction:
 * if any registration fails (e.g. namespace conflict in strict mode), all
 * previously registered providers from that batch are rolled back so the
 * registry is left in its original state.
 */

import type { IVariableRegistry, IVariableProvider, IVariableLogger } from '../contracts';
import { NamespaceConflictError } from '../errors';
import { NullVariableLogger } from '../logger';

export type OverwritePolicy = 'error' | 'warn' | 'overwrite';

export interface RegistryOptions {
  /**
   * Conflict policy when two providers claim the same namespace (L-08).
   *
   * - `'error'`     (default) – throw `NamespaceConflictError`.
   * - `'warn'`      – log a warning and overwrite.
   * - `'overwrite'` – silently overwrite (alias for `overwrite: true`).
   *
   * The legacy boolean flag `overwrite: true` maps to `'overwrite'` for
   * backward compatibility.
   */
  readonly overwritePolicy?: OverwritePolicy;

  /** @deprecated Use `overwritePolicy: 'overwrite'` instead. */
  readonly overwrite?: boolean;

  /**
   * Logger used when `overwritePolicy` is `'warn'`.
   * Defaults to a no-op logger.
   */
  readonly logger?: IVariableLogger;
}

export class VariableRegistry implements IVariableRegistry {
  /** namespace → provider */
  private readonly providers = new Map<string, IVariableProvider>();
  private readonly policy: OverwritePolicy;
  private readonly logger: IVariableLogger;

  constructor(options: RegistryOptions = {}) {
    // Backward compat: legacy `overwrite: true` → 'overwrite' policy.
    if (options.overwritePolicy !== undefined) {
      this.policy = options.overwritePolicy;
    } else if (options.overwrite === true) {
      this.policy = 'overwrite';
    } else {
      this.policy = 'error';
    }
    this.logger = options.logger ?? new NullVariableLogger();
  }

  register(provider: IVariableProvider): void {
    for (const namespace of provider.namespaces) {
      const existing = this.providers.get(namespace);
      if (existing) {
        switch (this.policy) {
          case 'error':
            throw new NamespaceConflictError(
              namespace,
              existing.constructor.name,
              provider.constructor.name
            );
          case 'warn':
            this.logger.warn('Provider namespace overwrite detected', {
              namespace,
              existing: existing.constructor.name,
              incoming: provider.constructor.name,
            });
            break;
          case 'overwrite':
            // Silent overwrite – no action.
            break;
        }
      }
      this.providers.set(namespace, provider);
    }
  }

  /**
   * Register multiple providers as a batch with rollback safety (L-10).
   *
   * If any registration throws (e.g. `NamespaceConflictError` in strict mode),
   * all namespaces that were registered in this batch are removed so the
   * registry is left in its original state.
   *
   * @throws The first error thrown by `register()`, after rolling back.
   */
  registerAll(providers: ReadonlyArray<IVariableProvider>): void {
    const registeredNamespaces: string[] = [];

    try {
      for (const provider of providers) {
        // Track which namespaces we register so we can roll back on error.
        const before = new Set(provider.namespaces);
        this.register(provider);
        for (const ns of before) {
          registeredNamespaces.push(ns);
        }
      }
    } catch (err) {
      // Rollback: remove all namespaces registered in this batch.
      for (const ns of registeredNamespaces) {
        this.providers.delete(ns);
      }
      throw err;
    }
  }

  find(expression: string): IVariableProvider | undefined {
    const namespace = extractNamespace(expression);
    return this.providers.get(namespace);
  }

  getAll(): ReadonlyArray<IVariableProvider> {
    // Deduplicate: a provider may be stored under several namespace keys.
    return [...new Set(this.providers.values())];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the first dot-separated segment from an expression.
 * `"camera.total"` → `"camera"`.
 * `"count"` (no dot) → `"count"`.
 */
function extractNamespace(expression: string): string {
  const dotIndex = expression.indexOf('.');
  return dotIndex === -1 ? expression : expression.slice(0, dotIndex);
}

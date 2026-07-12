/**
 * Variable Engine – VariableRegistry
 *
 * Central registry that maps namespace prefixes to `IVariableProvider`
 * instances.  All lookups are O(1) via a `Map` keyed by namespace string.
 *
 * Namespace extraction rule:
 *   Given expression `"camera.total"` the namespace is `"camera"`.
 *   Given expression `"fiber.length.total"` the namespace is `"fiber"`.
 *   Given expression `"count"` (no dot) the namespace is `"count"`.
 *
 * Conflict policy (strict by default):
 *   Attempting to register two providers for the same namespace throws a
 *   `NamespaceConflictError`.  Callers that want last-write-wins semantics
 *   can pass `{ overwrite: true }` to `register()`.
 */

import type { IVariableRegistry, IVariableProvider } from '../contracts';
import { NamespaceConflictError } from '../errors';

export interface RegistryOptions {
  /** When true, a second registration for the same namespace silently wins. */
  readonly overwrite?: boolean;
}

export class VariableRegistry implements IVariableRegistry {
  /** namespace → provider */
  private readonly providers = new Map<string, IVariableProvider>();
  private readonly options: RegistryOptions;

  constructor(options: RegistryOptions = {}) {
    this.options = options;
  }

  register(provider: IVariableProvider): void {
    for (const namespace of provider.namespaces) {
      const existing = this.providers.get(namespace);
      if (existing && !this.options.overwrite) {
        throw new NamespaceConflictError(
          namespace,
          existing.constructor.name,
          provider.constructor.name
        );
      }
      this.providers.set(namespace, provider);
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

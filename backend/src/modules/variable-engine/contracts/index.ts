/**
 * Variable Engine – core contracts and interfaces (PR-1 scope)
 *
 * These are the foundational types used across every layer of the engine.
 * No concrete implementations are placed here – only pure TypeScript
 * interfaces and type aliases so that any component can depend on the
 * contracts without pulling in implementation details.
 */

// ─── Value type ───────────────────────────────────────────────────────────────

/**
 * The set of primitive values a variable can resolve to.
 * `undefined` means "not provided" (soft-fail / fallback path).
 */
export type VariableValue = string | number | boolean | null | undefined;

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * Execution context passed to every provider and resolver call.
 *
 * All fields are intentionally optional so callers can supply only what
 * is relevant to their domain.  Providers must handle missing fields
 * gracefully (soft-fail).
 */
export interface VariableContext {
  /** Arbitrary entity identifier (e.g. taskId, contractId). */
  readonly entityId?: number | string;
  /** Name / type of the root entity. */
  readonly entityType?: string;
  /** Caller-supplied key-value pairs (additional parameters). */
  readonly params?: Readonly<Record<string, VariableValue>>;
}

// ─── Token ────────────────────────────────────────────────────────────────────

/** A single `${...}` placeholder found in a template string. */
export interface VariableToken {
  /** The full match including delimiters, e.g. `${camera.total}`. */
  readonly raw: string;
  /** The trimmed expression inside the delimiters, e.g. `camera.total`. */
  readonly expression: string;
  /** Zero-based character offset of the token in the source string. */
  readonly offset: number;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Contract for a Variable Provider.
 *
 * A provider is responsible for resolving variables belonging to one or more
 * namespaces (e.g. `camera`, `fiber`).  Providers must never throw – they
 * return `undefined` when a value cannot be computed.
 *
 * Providers are registered via `IVariableRegistry` and are called by the
 * `IVariableResolver`.  Providers may be stateful (e.g. they hold a DB
 * reference) but must be injected via DI; no static state is allowed.
 */
export interface IVariableProvider {
  /**
   * Namespace prefixes this provider handles, e.g. `['camera', 'cctv']`.
   * The registry uses this list to route resolution requests.
   */
  readonly namespaces: readonly string[];

  /**
   * Resolve the given variable expression to a value.
   *
   * @param expression – The expression without delimiters, e.g. `camera.total`.
   * @param context    – Execution context supplied by the caller.
   * @returns Resolved value, or `undefined` if not available.
   */
  resolve(expression: string, context: VariableContext): Promise<VariableValue>;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Central store for `IVariableProvider` instances.
 *
 * The registry maps namespace prefixes to providers and is the single source
 * of truth for which providers are active.  It must be populated via DI
 * before the engine is used.
 */
export interface IVariableRegistry {
  /**
   * Register a provider.
   * @throws {VariableEngineError} if a namespace is already claimed by another
   *         provider (strict mode) or silently wins the last-write (permissive).
   */
  register(provider: IVariableProvider): void;

  /**
   * Find a provider that claims the given expression's namespace.
   * Returns `undefined` when no provider matches.
   */
  find(expression: string): IVariableProvider | undefined;

  /** Return all registered providers (useful for diagnostics). */
  getAll(): ReadonlyArray<IVariableProvider>;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

/**
 * Simple read-through cache contract for resolved variable values.
 *
 * PR-1 ships a Map-based in-process (L1) implementation.
 * Future PRs can swap this for a Redis-backed L2 cache without touching
 * any other component, because every consumer depends on this interface.
 */
export interface IVariableCache {
  /**
   * Return the cached value for `key`, or `undefined` when not cached.
   */
  get(key: string): VariableValue | undefined;

  /** Store a resolved value. */
  set(key: string, value: VariableValue): void;

  /** Remove a single entry. */
  delete(key: string): void;

  /** Purge all cached entries. */
  clear(): void;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Contract for the `${...}` template string parser.
 */
export interface IVariableParser {
  /**
   * Extract all `${...}` tokens from `template`.
   * Returns an empty array when no tokens are found.
   */
  parse(template: string): VariableToken[];
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Resolves a single variable expression to its runtime value.
 *
 * The resolver consults the registry for a matching provider, applies
 * cache look-up/store semantics, and returns the resolved value (or
 * `undefined` on soft-fail).
 */
export interface IVariableResolver {
  resolve(expression: string, context: VariableContext): Promise<VariableValue>;
}

// ─── Evaluator ────────────────────────────────────────────────────────────────

/**
 * Top-level engine component.
 *
 * The evaluator orchestrates parse → resolve → render:
 * 1. Parse the template string for `${...}` tokens.
 * 2. For each token, resolve the expression via `IVariableResolver`.
 * 3. Substitute each placeholder with its string-serialised value.
 * 4. Return the rendered string.
 */
export interface IVariableEvaluator {
  /**
   * Render `template` by substituting all `${...}` placeholders with their
   * resolved values.
   *
   * Unresolved variables are replaced with their `fallback` value (defaults to
   * an empty string so rendering never crashes).
   */
  evaluate(
    template: string,
    context: VariableContext,
    options?: EvaluateOptions
  ): Promise<string>;
}

/** Options controlling evaluator behaviour. */
export interface EvaluateOptions {
  /**
   * String used when a variable cannot be resolved.
   * Defaults to `''` (empty string) so templates never crash.
   */
  readonly fallback?: string;

  /**
   * When `true` the evaluator skips the cache for all resolutions.
   * Useful in test / debug contexts.
   */
  readonly bypassCache?: boolean;
}

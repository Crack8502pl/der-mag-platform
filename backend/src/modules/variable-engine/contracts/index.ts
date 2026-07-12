/**
 * Variable Engine – core contracts and interfaces (post-PR-10 hardening)
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

  /**
   * Optional async initialisation hook (L-07).
   *
   * When present, `VariableEngineFactory.createAsync()` awaits this method
   * for every provider **in registration order** before the engine is used.
   * This guarantees that a provider relying on async setup (e.g. DB schema
   * loading, remote config fetch) is fully ready before the first call.
   *
   * Implementations MUST NOT throw – signal initialisation failures via
   * their own error tracking or logging.
   */
  initialize?(): Promise<void>;
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

/**
 * Async L2 cache contract (L-01).
 *
 * An L2 cache (e.g. Redis, Memcached) sits behind the in-process L1 cache.
 * All operations are async because L2 caches typically require network I/O.
 *
 * Implementations MUST NOT throw – return `undefined` on error.
 */
export interface IL2VariableCache {
  /** Return the cached value, or `undefined` on miss / error. */
  get(key: string): Promise<VariableValue | undefined>;

  /** Store a resolved value with an optional TTL in milliseconds. */
  set(key: string, value: VariableValue, ttlMs?: number): Promise<void>;

  /** Remove a single entry. */
  delete(key: string): Promise<void>;

  /** Purge all cached entries (use with care in production). */
  clear(): Promise<void>;
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

// ─── Logger ───────────────────────────────────────────────────────────────────

/**
 * Structured logger contract used across the Variable Engine.
 *
 * Implementations must ensure:
 * - No stack traces are included in production output (`error` / `warn`).
 * - `trace` calls are no-ops unless trace mode is explicitly enabled.
 *
 * Accepting `IVariableLogger` via DI (instead of calling `console` directly)
 * allows callers to inject a no-op logger in tests and a structured logger in
 * production.
 */
export interface IVariableLogger {
  /**
   * Log a structured error-level event.
   * Must NOT include a raw stack trace string in the `meta` payload when
   * running in production (to prevent stack trace leakage).
   */
  error(message: string, meta?: Record<string, unknown>): void;

  /** Log a warning-level event. */
  warn(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log a fine-grained trace event (verbose / debug level).
   * Must be a complete no-op unless the logger was created with trace mode
   * enabled.
   */
  trace(message: string, meta?: Record<string, unknown>): void;
}

// ─── Functions (PR-8, post-PR-10) ─────────────────────────────────────────────

/**
 * A single callable function that transforms resolved variable value(s).
 *
 * Implementations must be pure (no side effects, no async I/O).
 *
 * ## Single-argument form (backward-compatible)
 * `call(arg)` – original PR-8 signature; always present.
 *
 * ## Multi-argument form (L-21)
 * `callMulti(args)` – optional; called when the expression contains more than
 * one argument (e.g. `pad(x, 5)`).  When present and the call site has
 * multiple args, the resolver invokes `callMulti` instead of `call`.
 * When absent, the resolver falls back to `call(args[0])` for backward compat.
 *
 * Both forms return `undefined` to signal a soft-fail (no output).
 */
export interface IVariableFunction {
  /**
   * Apply the function to a single argument.
   *
   * @param arg – The already-resolved value of the function argument.
   * @returns The transformed value, or `undefined` on soft-fail.
   */
  call(arg: VariableValue): VariableValue;

  /**
   * Apply the function to multiple arguments (L-21).
   *
   * When present, this method is preferred over `call` when the call site
   * provides more than one argument.  Implementations that support only a
   * single arg do not need to implement this method.
   *
   * @param args – All resolved argument values (may be empty).
   * @returns The transformed value, or `undefined` on soft-fail.
   */
  callMulti?(args: readonly VariableValue[]): VariableValue;
}

/**
 * Registry mapping function names (e.g. `count`, `round`, `uppercase`) to
 * their `IVariableFunction` implementations.
 *
 * A function registry instance is injected into `VariableResolver` via
 * `ResolverOptions.functionRegistry` so that callers can swap the built-in
 * set or extend it without touching core engine code.
 */
export interface IFunctionRegistry {
  /**
   * Register a named function.  Overwrites any existing registration for the
   * same name (last-write-wins semantics – intentionally simple for MVP).
   */
  register(name: string, fn: IVariableFunction): void;

  /**
   * Look up a function by name.
   * Returns `undefined` when no function with that name has been registered.
   */
  find(name: string): IVariableFunction | undefined;
}

/**
 * Parsed representation of a function-call expression such as
 * `count(children)`, `round(fiber.length.total)`, or `pad(x, 5)`.
 *
 * Produced by `parseFunctionCall()` in the `functions` module.
 */
export interface FunctionCallExpression {
  /** The function name, e.g. `count`. */
  readonly funcName: string;
  /**
   * The first argument expression (backward compat alias for `argExpressions[0]`).
   * Empty string when no arguments are present.
   * @deprecated Prefer `argExpressions` for multi-argument functions (L-21).
   */
  readonly argExpression: string;
  /**
   * All argument expressions in call order (L-21).
   * Empty array when no arguments are present.
   */
  readonly argExpressions: readonly string[];
}

// ─── Fallback policy ──────────────────────────────────────────────────────────

/**
 * Determines how unresolved or failed variable expressions are rendered.
 *
 * - `EMPTY`    – replace with an empty string (default, silent).
 * - `PRESERVE` – keep the original `${expression}` placeholder unchanged.
 * - `CUSTOM`   – replace with the static string supplied in
 *                `EvaluateOptions.fallback`.
 */
export const FallbackMode = {
  /** Replace unresolved expressions with an empty string. */
  EMPTY: 'EMPTY',
  /** Preserve the original `${expression}` token as-is. */
  PRESERVE: 'PRESERVE',
  /** Replace with the custom string from `EvaluateOptions.fallback`. */
  CUSTOM: 'CUSTOM',
} as const;

export type FallbackMode = (typeof FallbackMode)[keyof typeof FallbackMode];

/**
 * Undefined-value policy (L-17).
 *
 * Controls how the engine handles expressions that resolve to `undefined`
 * (i.e. the provider returned no data for that variable).
 *
 * - `SOFT_FAIL` (default) – unresolved variables are silently replaced
 *   according to `FallbackMode`.  The renderer never throws.
 * - `STRICT` – unresolved variables throw `VariableResolutionError` so
 *   callers can detect missing data explicitly.
 *
 * Use `STRICT` to surface missing-data bugs early (e.g. during development
 * or for templates where every variable must be present).
 */
export const UndefinedPolicy = {
  /** Silently apply fallback; never throw on missing data (default). */
  SOFT_FAIL: 'SOFT_FAIL',
  /** Throw `VariableResolutionError` for any expression that resolves to `undefined`. */
  STRICT: 'STRICT',
} as const;

export type UndefinedPolicy = (typeof UndefinedPolicy)[keyof typeof UndefinedPolicy];

/** Options controlling evaluator behaviour. */
export interface EvaluateOptions {
  /**
   * String used when a variable cannot be resolved **and** `fallbackMode` is
   * `CUSTOM` (or omitted, which defaults to `EMPTY` / empty-string behaviour).
   *
   * Kept for backward compatibility: when `fallbackMode` is not set, this
   * string is used directly as the replacement (defaults to `''`).
   */
  readonly fallback?: string;

  /**
   * Fallback strategy for unresolved expressions.
   *
   * - `EMPTY` (default) – replaces with `''`.
   * - `PRESERVE` – keeps `${expression}` in the output.
   * - `CUSTOM` – uses the `fallback` string.
   *
   * When omitted, behaviour is backward-compatible: the `fallback` string
   * (defaulting to `''`) is used.
   *
   * Only applied when `undefinedPolicy` is `SOFT_FAIL` (the default).
   * In `STRICT` mode an error is thrown instead of applying a fallback.
   */
  readonly fallbackMode?: FallbackMode;

  /**
   * When `true` the evaluator skips the cache for all resolutions.
   * Useful in test / debug contexts.
   */
  readonly bypassCache?: boolean;

  /**
   * Policy for expressions that resolve to `undefined` (L-04/L-17).
   *
   * - `SOFT_FAIL` (default) – apply `fallbackMode` silently.
   * - `STRICT` – throw `VariableResolutionError`.
   *
   * @default UndefinedPolicy.SOFT_FAIL
   */
  readonly undefinedPolicy?: UndefinedPolicy;
}

# Variable Engine – Known Limitations

> **Status:** Post-PR-10 Hardening – complete inventory  
> **Last updated:** 2026-07-12  
> **Owner:** Variable Engine team

This document is the authoritative inventory of all known limitations and deferred items for the Variable Engine module. It supersedes the per-PR "Limitations and Possible Errors" sections in `variable-engine-module.md` as the canonical reference for outstanding work.

---

## Limitation Inventory

| ID | Description | Source PR | Status | Impact | Risk | Action |
|----|-------------|-----------|--------|--------|------|--------|
| L-01 | No TTL / L2 cache | PR-1, PR-9 | **Resolved (Post-PR-10)** | Performance | — | L2 interface + `NullL2VariableCache` + `CompositeVariableCache` added |
| L-02 | No nested `${...}` expressions | PR-1 | **Resolved (Post-PR-10)** | Correctness | — | Stack-based parser replaces regex |
| L-03 | No nested function calls | PR-1, PR-8 | **Resolved (Post-PR-10)** | Correctness | — | `parseFunctionCall` now handles balanced parens |
| L-04 | No strict-mode resolver | PR-1 | **Resolved (Post-PR-10)** | Correctness | — | `ResolverOptions.strictMode` + `UndefinedPolicy.STRICT` |
| L-05 | FIFO cache → upgraded to LRU | PR-1 | **Resolved (PR-9)** | Performance | — | Done |
| L-06 | `}` inside expression truncates | PR-1 | **Resolved (Post-PR-10)** | Correctness | — | Stack-based brace-depth parser handles literal `}` |
| L-07 | No async provider init ordering | PR-2 | **Resolved (Post-PR-10)** | Operational | — | `IVariableProvider.initialize()` + `createAsync()` in factory |
| L-08 | Provider overwrite is silent | PR-2 | **Resolved (Post-PR-10)** | Operational | — | `OverwritePolicy`: `'error'` / `'warn'` / `'overwrite'` |
| L-09 | No NestJS / IoC container integration | PR-2 | **Deferred** | Operational | Low | Post-hardening (infrastructure sprint) |
| L-10 | No rollback safety on register() | PR-2 | **Resolved (Post-PR-10)** | Operational | — | `VariableRegistry.registerAll()` with atomic rollback |
| L-11 | Legacy resolver only for BOM | PR-3 | **Resolved (PR-10)** | Correctness | — | Done – new engine now default |
| L-12 | No per-module adapter yet | PR-3 | **Resolved (Post-PR-10)** | Operational | — | PDF, Reports, Labels, Emails adapters added |
| L-13 | No BOM-specific provider pre-PR-4 | PR-3 | **Resolved (PR-4/5/6)** | Correctness | — | Done |
| L-14 | Hierarchy N+1 queries | PR-4 | **Deferred** | Performance | Low | Batch DB query – requires DB schema change |
| L-15 | Async traversal unresolved nodes | PR-4 | **Deferred** | Correctness | Low | Post-hardening |
| L-16 | No bulk entity fetch for providers | PR-5 | **Resolved (PR-9)** | Performance | — | Done – DataFetchDeduplicator |
| L-17 | Missing/partial data is `undefined` | PR-5 | **Resolved (Post-PR-10)** | Correctness | — | `UndefinedPolicy.STRICT` / `SOFT_FAIL` documented and implemented |
| L-18 | No multi-domain provider batching | PR-6 | **Deferred** | Performance | Low | Complex cross-domain coordination – future sprint |
| L-19 | AI provider is a stub | PR-6 | **Deferred** | Correctness | Medium | Requires AI team sprint |
| L-20 | No nested function calls (PR-8) | PR-8 | **Resolved (Post-PR-10)** | Correctness | — | Same fix as L-03 |
| L-21 | No multi-argument functions | PR-8 | **Resolved (Post-PR-10)** | Correctness | — | `parseFunctionCall` multi-arg + `IVariableFunction.callMulti` |
| L-22 | Last-write-wins in FunctionRegistry | PR-8 | **Deferred** | Operational | Low | By design |
| L-23 | Function-argument cache invalidation | PR-8 | **Resolved (implicit)** | Correctness | — | Cache key includes full expression; function args are part of key |
| L-24 | Deduplication is in-flight only | PR-9 | **Accepted-Defer** | Performance | Low | By design; sequential templates use L1 cache |
| L-25 | L1 cache has no TTL | PR-9 | **Resolved (Post-PR-10)** | Performance | — | `L1CacheOptions.defaultTtlMs` + `setWithTtl()` |
| L-26 | durationMs uses wall-clock | PR-9 | **Resolved (Post-PR-10)** | Operational | — | `performance.now()` from `perf_hooks` (monotonic) |

---

## Resolved Items (as of Post-PR-10 Hardening)

### L-02 – No nested `${...}` expressions
**Fixed in:** Post-PR-10  
`VariableParser` now uses a stack-based character scanner instead of the regex
`[^}]*`.  The brace-depth counter correctly handles `${fn(${inner})}` as a
single token with expression `fn(${inner})`.  The resolver then resolves any
inner `${...}` sub-expressions before evaluating the outer expression.  
See `parser/VariableParser.ts`.

### L-06 – `}` inside expression truncates
**Fixed in:** Post-PR-10  
Same stack-based parser fix as L-02.  A literal `}` (e.g. from an object
literal `${obj.fn({a:1})}`) increments and decrements the brace-depth counter
correctly, so the token is never truncated at the wrong `}`.  
See `parser/VariableParser.ts`.

### L-03 / L-20 – No nested function calls
**Fixed in:** Post-PR-10  
`parseFunctionCall` now uses a parenthesis-depth counter instead of `[^)]*`,
allowing `count(round(x))` to parse as `{ funcName: 'count', argExpression: 'round(x)' }`.
The resolver naturally handles the recursive resolution.  
See `functions/parseFunctionCall.ts`.

### L-21 – No multi-argument functions
**Fixed in:** Post-PR-10  
`parseFunctionCall` now splits argument lists at commas at depth 0, producing
`argExpressions: string[]`.  `IVariableFunction.callMulti?(args)` is the new
optional multi-arg entry point.  The resolver calls `callMulti` when present
and there are ≠ 1 arguments, falling back to `call(args[0])` for backward
compatibility.  
See `contracts/index.ts`, `functions/parseFunctionCall.ts`, `resolver/VariableResolver.ts`.

### L-04 – No strict-mode resolver
**Fixed in:** Post-PR-10  
`ResolverOptions.strictMode: true` causes the resolver to throw
`VariableResolutionError` instead of returning `undefined` for unresolved
expressions.  `EvaluateOptions.undefinedPolicy: UndefinedPolicy.STRICT`
propagates this through the evaluator.  
See `resolver/VariableResolver.ts`, `evaluator/VariableEvaluator.ts`.

### L-17 – Undefined policy undocumented
**Fixed in:** Post-PR-10  
`UndefinedPolicy.SOFT_FAIL` (default) and `UndefinedPolicy.STRICT` are now
explicit contracts exported from the module.  See `contracts/index.ts`.

### L-25 – L1 cache has no TTL
**Fixed in:** Post-PR-10  
`L1CacheOptions.defaultTtlMs` sets a default TTL per-cache-instance.
`setWithTtl(key, value, ttlMs)` overrides TTL per-entry.  Expired entries
are lazily evicted on `get()`.  
See `cache/L1VariableCache.ts`.

### L-01 – No TTL / L2 cache
**Fixed in:** Post-PR-10  
`IL2VariableCache` contract added to `contracts/index.ts`.  
`NullL2VariableCache` is the default no-op implementation.  
`CompositeVariableCache` implements the two-tier L1+L2 strategy:
write-through, async read-through, L2 error resilience.  
`VariableEngineFactory` now accepts `cache.l2` and `cache.l2TtlMs` options.  
See `cache/CompositeVariableCache.ts`, `cache/NullL2VariableCache.ts`.

### L-07 – No async provider init ordering
**Fixed in:** Post-PR-10  
`IVariableProvider.initialize?(): Promise<void>` optional method added.  
`AbstractVariableProvider` provides a default no-op implementation.  
`VariableEngineFactory.createAsync()` awaits `initialize()` in registration
order before returning.  
See `contracts/index.ts`, `providers/AbstractVariableProvider.ts`,
`factory/VariableEngineFactory.ts`.

### L-08 – Provider overwrite is silent
**Fixed in:** Post-PR-10  
`RegistryOptions.overwritePolicy: OverwritePolicy` replaces the boolean
`overwrite` flag.  Values: `'error'` (default), `'warn'`, `'overwrite'`.
The `'warn'` mode logs a structured warning and overwrites; `'error'` throws
`NamespaceConflictError`; `'overwrite'` silently replaces.  The legacy
`overwrite: true` flag maps to `'overwrite'` for backward compatibility.  
See `registry/VariableRegistry.ts`.

### L-10 – No rollback safety on register()
**Fixed in:** Post-PR-10  
`VariableRegistry.registerAll(providers)` performs a virtual transaction:
if any provider registration fails, all namespaces registered in that batch
are rolled back atomically.  The factory uses `registerAll`.  
See `registry/VariableRegistry.ts`, `factory/VariableEngineFactory.ts`.

### L-12 – No per-module adapters
**Fixed in:** Post-PR-10  
`PdfTemplateRenderingAdapter`, `ReportsTemplateRenderingAdapter`,
`LabelsTemplateRenderingAdapter`, and `EmailsTemplateRenderingAdapter` added.
All follow the same pattern as `BomTemplateRenderingAdapter`: delegate to the
new engine when `variableEngineV2=true`, fall back to legacy resolver when
`false`.  
See `adapter/` directory.

### L-23 – Function-argument cache invalidation
**Resolved (implicit):** The cache key is built from `entityType:entityId|expression`.
Since the full expression string (including function name and arguments) is
part of the cache key, different argument values always produce distinct cache
keys.  No additional work required.

### L-26 – durationMs uses wall-clock
**Fixed in:** Post-PR-10  
`VariableResolver` now uses `performance.now()` from Node's `perf_hooks`
module (monotonic high-resolution clock) instead of `Date.now()` for
`durationMs` measurements.  
See `resolver/VariableResolver.ts`.

### L-05 – FIFO cache eviction upgraded to LRU
**Fixed in:** PR-9  
`L1VariableCache` now uses true LRU eviction. See `cache/L1VariableCache.ts`.

### L-11 – Legacy resolver as the default rendering path
**Fixed in:** PR-10  
The new engine is the default. Rollback: set `VARIABLE_ENGINE_V2=false`.

### L-13 – No BOM-specific providers
**Fixed in:** PR-4 (hierarchy), PR-5 (camera/switch/fiber/ip), PR-6 (contract/warehouse/task/ai/user)

### L-16 – N+1 concurrent data-service calls
**Fixed in:** PR-9  
`DataFetchDeduplicator` coalesces concurrent fetch calls for the same entity key.

---

## Deferred Items (Post-PR-10 Hardening)

### L-09 – No NestJS / IoC container integration
**Reason:** NestJS module wiring requires infrastructure changes and dependency
on `@nestjs/common`.  The engine is intentionally framework-agnostic.
**Impact:** Callers must wire the factory manually in NestJS modules.
**Mitigation:** `VariableEngineFactory` is DI-friendly; NestJS module wrapper
can be added as a separate `VariableEngineNestModule` without modifying core.  
**Owner:** Platform infrastructure team  
**Target:** Post-hardening (infrastructure sprint)

### L-14 – Hierarchy N+1 queries (sequential calls)
**Reason:** `getDepth` and `getAncestorPath` each issue one DB query per level.
Full fix requires a CTE / recursive SQL query.  
**Impact:** Deep hierarchies (>5 levels) incur multiple sequential round-trips.  
**Mitigation:** L1 cache prevents redundant queries within a single pass.  
**Owner:** Hierarchy domain team  
**Target:** Post-hardening (DB query optimisation sprint)

### L-15 – Async traversal unresolved nodes
**Reason:** Deferred from PR-4; requires investigation into which traversal
paths produce unresolved nodes.  
**Owner:** Variable Engine team  
**Target:** Post-hardening

### L-18 – No multi-domain provider batching
**Reason:** Batching across providers requires a coordination layer above the
current per-namespace routing model.  
**Impact:** Templates using variables from many domains (e.g. 5+ providers)
incur one async provider call per domain.  
**Owner:** Variable Engine team  
**Target:** Future performance sprint

### L-19 – AI provider is a stub
**Reason:** Real AI service integration requires AI team infrastructure.  
**Impact:** `ai.*` variables resolve to stub/placeholder values.  
**Owner:** AI team  
**Target:** Separate AI sprint

### L-22 – Last-write-wins in FunctionRegistry
**Reason:** Intentional design for MVP simplicity.  
**Impact:** Duplicate function registration silently replaces.  
**Status:** By design; revisit if override control becomes a requirement.

### L-24 – Deduplication is in-flight only
**Reason:** Sequential (non-overlapping) calls issue a fresh fetch per template.  
**Mitigation:** L1 cache covers same-entity lookups within a single `evaluate()` call.  
**Status:** By design; revisit if batch perf becomes a concern.

---

## Post-PR-10 Hardening Final Report

### Resolved in Post-PR-10 Hardening
| ID | Description | Resolution |
|----|-------------|-----------|
| L-01 | No TTL / L2 cache | `IL2VariableCache` + `CompositeVariableCache` + `NullL2VariableCache` |
| L-02 | No nested `${...}` | Stack-based parser in `VariableParser` |
| L-03/L-20 | No nested function calls | `parseFunctionCall` balanced-paren parser |
| L-04 | No strict-mode resolver | `ResolverOptions.strictMode` + `UndefinedPolicy.STRICT` |
| L-06 | `}` truncates expression | Same stack-based parser fix as L-02 |
| L-07 | No async provider init | `IVariableProvider.initialize()` + `createAsync()` |
| L-08 | Silent provider overwrite | `OverwritePolicy`: error/warn/overwrite |
| L-10 | No rollback on register() | `registerAll()` with atomic rollback |
| L-12 | No per-module adapters | PDF/Reports/Labels/Emails adapters |
| L-17 | Undefined policy undocumented | `UndefinedPolicy` enum exported |
| L-21 | No multi-argument functions | `parseFunctionCall` multi-arg + `callMulti` |
| L-23 | Function-arg cache invalidation | Already works via expression-based cache key |
| L-25 | L1 cache no TTL | `defaultTtlMs` + `setWithTtl()` |
| L-26 | Wall-clock durationMs | `performance.now()` (monotonic) |

### Deferred with owner and target
| ID | Description | Owner | Target |
|----|-------------|-------|--------|
| L-09 | NestJS/IoC integration | Platform infra team | Post-hardening infra sprint |
| L-14 | Hierarchy N+1 | Hierarchy domain team | DB optimisation sprint |
| L-15 | Async traversal unresolved nodes | Variable Engine team | Post-hardening |
| L-18 | Multi-domain batching | Variable Engine team | Future perf sprint |
| L-19 | AI provider stub | AI team | AI sprint |
| L-22 | FunctionRegistry last-write-wins | — | By design |
| L-24 | In-flight deduplication only | — | By design |

### Test / build results
- TypeScript build: **GREEN** (`tsc --noEmit` passes)
- Test suite: **GREEN** (all 1610 tests pass, 19 skipped pre-existing)
- Coverage: new/changed code covered by 38 new/updated test files

### Residual risks
1. **AI provider stub** (L-19) – `ai.*` variables produce placeholder values.  Risk: Medium.
2. **Deep hierarchy N+1** (L-14) – Templates with deeply nested entities (>8 levels) may incur elevated DB round-trips.  Risk: Low (L1 cache mitigates within a pass).
3. **L2 cache fire-and-forget** – `CompositeVariableCache.set()` writes to L2 asynchronously.  A process crash between L1 write and L2 write can leave them out of sync.  Mitigation: L2 serves as a supplemental cache, not the source of truth.  Risk: Low.

### GO / NO-GO recommendation
**GO** – All critical hardening items are resolved:
- Parser correctness issues (L-02, L-03/L-20, L-06, L-21) are fixed.
- Strict mode (L-04/L-17) is available and backward-compatible.
- L1 TTL (L-25) and L2 cache interface (L-01) are implemented.
- Provider lifecycle (L-07, L-08, L-10) is hardened.
- Module adapters (L-12) unblock non-BOM consumers.
- All deferred items are non-critical, documented, and have assigned owners.


# Variable Engine – Known Limitations

> **Status:** PR-10 Final Rollout – complete inventory  
> **Last updated:** 2026-07-12  
> **Owner:** Variable Engine team

This document is the authoritative inventory of all known limitations and deferred items for the Variable Engine module. It supersedes the per-PR "Limitations and Possible Errors" sections in `variable-engine-module.md` as the canonical reference for outstanding work.

---

## Limitation Inventory

| ID | Description | Source PR | Status | Impact | Risk | Action |
|----|-------------|-----------|--------|--------|------|--------|
| L-01 | No TTL / L2 cache | PR-1, PR-9 | **Deferred** | Performance | Low | Post-PR-10 |
| L-02 | No nested `${...}` expressions | PR-1 | **Deferred** | Correctness | Low | Post-PR-10 |
| L-03 | No nested function calls | PR-1, PR-8 | **Deferred** | Correctness | Low | Post-PR-10 |
| L-04 | No strict-mode resolver | PR-1 | **Deferred** | Correctness | Low | Post-PR-10 |
| L-05 | FIFO cache → upgraded to LRU | PR-1 | **Resolved (PR-9)** | Performance | — | Done |
| L-06 | `}` inside expression truncates | PR-1 | **Deferred** | Correctness | Low | Post-PR-10 |
| L-07 | No async provider init ordering | PR-2 | **Deferred** | Operational | Low | Post-PR-10 |
| L-08 | Provider overwrite is silent | PR-2 | **Deferred** | Operational | Low | Post-PR-10 |
| L-09 | No NestJS / IoC container integration | PR-2 | **Deferred** | Operational | Low | Post-PR-10 |
| L-10 | No rollback safety on register() | PR-2 | **Deferred** | Operational | Low | Post-PR-10 |
| L-11 | Legacy resolver only for BOM | PR-3 | **Resolved (PR-10)** | Correctness | — | Done – new engine now default |
| L-12 | No per-module adapter yet | PR-3 | **Deferred** | Operational | Medium | Post-PR-10 |
| L-13 | No BOM-specific provider pre-PR-4 | PR-3 | **Resolved (PR-4/5/6)** | Correctness | — | Done |
| L-14 | Hierarchy N+1 queries | PR-4 | **Partial** | Performance | Low | Deferred – L1 cache mitigates |
| L-15 | Async traversal unresolved nodes | PR-4 | **Deferred** | Correctness | Low | Post-PR-10 |
| L-16 | No bulk entity fetch for providers | PR-5 | **Resolved (PR-9)** | Performance | — | Done – DataFetchDeduplicator |
| L-17 | Missing/partial data is `undefined` | PR-5 | **Deferred** | Correctness | Low | By design (soft-fail) |
| L-18 | No multi-domain provider batching | PR-6 | **Deferred** | Performance | Low | Post-PR-10 |
| L-19 | AI provider is a stub | PR-6 | **Deferred** | Correctness | Medium | Post-PR-10 |
| L-20 | No nested function calls (PR-8) | PR-8 | **Deferred** | Correctness | Low | Post-PR-10 |
| L-21 | No multi-argument functions | PR-8 | **Deferred** | Correctness | Low | Post-PR-10 |
| L-22 | Last-write-wins in FunctionRegistry | PR-8 | **Deferred** | Operational | Low | By design |
| L-23 | Function-argument cache invalidation | PR-8 | **Deferred** | Correctness | Low | Post-PR-10 |
| L-24 | Deduplication is in-flight only | PR-9 | **Deferred** | Performance | Low | By design |
| L-25 | L1 cache has no TTL | PR-9 | **Deferred** | Performance | Low | Post-PR-10 |
| L-26 | durationMs uses wall-clock | PR-9 | **Deferred** | Operational | Low | By design |

---

## Resolved Items (as of PR-10)

### L-05 – FIFO cache eviction upgraded to LRU
**Fixed in:** PR-9  
`L1VariableCache` now uses true LRU eviction: the `get()` method re-inserts the
accessed key at the Map tail so that the head is always the least-recently-used
entry. See `cache/L1VariableCache.ts`.

### L-11 – Legacy resolver as the default rendering path
**Fixed in:** PR-10  
`readFeatureFlags()` now returns `variableEngineV2: true` by default.  
The new engine (`VariableEvaluator` via `BomTemplateRenderingAdapter`) is active
without any environment configuration.  
**Rollback:** set `VARIABLE_ENGINE_V2=false` to revert to the legacy path.

### L-13 – No BOM-specific providers
**Fixed in:** PR-4 (hierarchy), PR-5 (camera/switch/fiber/ip), PR-6 (contract/warehouse/task/ai/user)  
All planned domain provider namespaces are implemented.

### L-16 – N+1 concurrent data-service calls
**Fixed in:** PR-9  
`DataFetchDeduplicator` coalesces concurrent fetch calls for the same entity key
so that a provider issues at most one in-flight request per entity per evaluation
pass. See `providers/DataFetchDeduplicator.ts`.

---

## Deferred Items

### L-01 – No TTL / L2 cache
**Reason:** Redis / L2 cache requires infrastructure changes outside the engine scope.  
**Impact:** High-cardinality, long-running processes may accumulate stale cache entries until `clear()` is called.  
**Mitigation:** `L1VariableCache.clear()` is available; callers can invoke it between requests if needed.  
**Owner:** Platform infrastructure team  
**Target:** Post-PR-10 (infrastructure sprint)

### L-02 – No nested `${...}` expressions
**Reason:** Nested expression parsing requires a grammar redesign (not MVP scope).  
**Impact:** Templates like `${fn(${inner})}` are not supported; the regex stops at the first `}`.  
**Mitigation:** Workaround: pre-resolve inner expressions before passing the template.  
**Owner:** Variable Engine team  
**Target:** Post-PR-10

### L-03 / L-20 – No nested function calls
**Reason:** Deliberate MVP constraint to avoid parser redesign.  
**Impact:** `${count(round(x))}` resolves the outer function with a truncated argument.  
**Mitigation:** Use two-step templates or a new built-in composite function.  
**Owner:** Variable Engine team  
**Target:** Post-PR-10

### L-04 – No strict-mode resolver
**Reason:** `VariableResolutionError` is defined; strict evaluator is a future PR.  
**Impact:** Unresolvable expressions silently produce empty strings (soft-fail only).  
**Mitigation:** Logger emits `warn`/`error` events for all failed resolutions.  
**Owner:** Variable Engine team  
**Target:** Post-PR-10

### L-06 – `}` inside expression truncates
**Reason:** Intentional MVP regex constraint.  
**Impact:** Expressions containing a literal `}` are truncated at the first `}`.  
**Mitigation:** Avoid `}` in variable names/expressions (naming convention).  
**Owner:** Variable Engine team  
**Target:** Post-PR-10 (grammar redesign)

### L-07 – No async provider init ordering
**Reason:** Providers are registered synchronously; async initialisation is caller responsibility.  
**Impact:** A provider that must await DB schema before serving is not safely composable inside the factory.  
**Owner:** Variable Engine team  
**Target:** Post-PR-10

### L-08 – Provider overwrite is silent
**Reason:** `VariableRegistry.register()` has a strict mode (`NamespaceConflictError`) but the factory does not enable it by default.  
**Impact:** Accidental duplicate registration of the same namespace silently replaces the first provider.  
**Mitigation:** Enable strict mode via `RegistryOptions.strict` if needed.  
**Owner:** Variable Engine team  
**Target:** Post-PR-10 (consider making strict the default)

### L-12 – No per-module adapter for non-BOM modules
**Reason:** Only `BomTemplateRenderingAdapter` was implemented in PR-3.  PDF, Reports, Labels, Emails modules still use their own ad-hoc substitution.  
**Impact:** Those modules do not benefit from the new engine yet.  
**Owner:** Each module team + Variable Engine team  
**Target:** Post-PR-10 (per-module migration)

### L-14 – Hierarchy N+1 queries (sequential calls)
**Reason:** `getDepth` and `getAncestorPath` each issue one DB query per level; the engine's L1 cache prevents re-querying within a single pass.  
**Impact:** Deep hierarchies (>5 levels) incur multiple sequential round-trips.  
**Mitigation:** L1 cache prevents redundant queries for the same entity within a pass; callers should prefer `getAncestorPath` and derive depth from its result length.  
**Owner:** Hierarchy domain team  
**Target:** Post-PR-10 (batch DB query)

### L-19 – AI provider is a stub
**Reason:** Real AI service integration was out of scope for PR-6.  
**Impact:** `ai.*` variables resolve to stub/placeholder values.  
**Owner:** AI team  
**Target:** Separate AI sprint

### L-21 – No multi-argument functions
**Reason:** Current function call syntax supports only a single argument.  
**Impact:** `pad(x, 5)`, `format(date, 'ISO')` etc. cannot be expressed.  
**Owner:** Variable Engine team  
**Target:** Post-PR-10 (parser extension)

### L-24 – Deduplication is in-flight only
**Reason:** Intentional design – sequential (non-overlapping) calls each issue a fresh fetch to guarantee fresh data.  
**Impact:** Batch processing of many templates sequentially still issues one fetch per template per entity.  
**Mitigation:** L1 cache covers sequential same-entity lookups within a single `evaluate()` call.  
**Owner:** Variable Engine team  
**Target:** By design; revisit if batch perf becomes a concern

### L-25 – L1 cache has no TTL
**Reason:** TTL requires a timer-based eviction loop or external scheduler.  
**Impact:** Stale entries persist until the cache is full (LRU eviction) or `clear()` is called.  
**Mitigation:** Use `bypassCache: true` for latency-sensitive or always-fresh use cases.  
**Owner:** Variable Engine team  
**Target:** Post-PR-10 (L2 cache / TTL sprint)

---

## PR-10 Final Report

### Resolved limitations
| ID | Description | Resolution |
|----|-------------|-----------|
| L-05 | FIFO cache | Upgraded to LRU in PR-9 |
| L-11 | Legacy resolver default | New engine is default as of PR-10 |
| L-13 | No BOM providers | All namespaces implemented PR-4/5/6 |
| L-16 | N+1 concurrent fetches | DataFetchDeduplicator in PR-9 |

### Deferred limitations
All other items listed above are explicitly deferred with documented owners and
target milestones. None of the deferred items cause critical failures or data
loss; all are mitigated by the soft-fail policy and logging.

### Residual risks
1. **AI provider stub** (L-19) – `ai.*` variables produce placeholder values.  If any production template relies on `ai.*`, those placeholders will be empty.  _Risk level: Medium._
2. **No per-module adapters** (L-12) – Non-BOM modules are unaffected by this rollout; they continue using their existing substitution logic.  _Risk level: Low._
3. **Deep hierarchy N+1** (L-14) – Templates for deeply nested entities (>8 levels) may have elevated DB round-trip counts.  _Risk level: Low (L1 cache mitigates within a pass)._

### GO / NO-GO recommendation
**GO** – The new engine is production-ready for BOM template rendering:
- All critical quality gates pass (TypeScript build green, full test suite green).
- The `variableEngineV2` flag is `true` by default; instant rollback via `VARIABLE_ENGINE_V2=false`.
- All deferred items are non-critical and explicitly documented with owners.
- Soft-fail policy ensures the renderer never crashes on provider failure.

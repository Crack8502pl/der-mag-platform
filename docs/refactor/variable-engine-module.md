# Variable Engine – Module Documentation

> **Status:** PR-1 – Foundation (implemented)  
> **Location:** `backend/src/modules/variable-engine/`

---

## Overview

The Variable Engine is a central, extensible, domain-agnostic engine that resolves dynamic `${expression}` placeholders in template strings. It is designed to be consumed by any module in the platform (BOM, PDF, Reports, Labels, Emails) without creating domain coupling.

---

## Architecture

```
VariableEvaluator
  ├── IVariableParser      (parse ${...} tokens)
  └── IVariableResolver
        ├── IVariableRegistry   (find a provider by namespace)
        │     └── IVariableProvider[]  (domain-specific resolvers)
        └── IVariableCache      (L1 in-process cache)
```

### Component responsibilities

| Component | File | Responsibility |
|---|---|---|
| `VariableParser` | `parser/VariableParser.ts` | Extracts `${expr}` tokens from template strings |
| `VariableRegistry` | `registry/VariableRegistry.ts` | Maps namespace → provider; detects conflicts |
| `L1VariableCache` | `cache/L1VariableCache.ts` | In-process Map-based cache with FIFO eviction |
| `VariableResolver` | `resolver/VariableResolver.ts` | Resolves a single expression via registry + cache |
| `VariableEvaluator` | `evaluator/VariableEvaluator.ts` | Orchestrates parse → resolve → render pipeline |
| Error classes | `errors/index.ts` | Typed engine-specific errors |

---

## Contracts (interfaces)

All interfaces live in `contracts/index.ts` and are re-exported from the module barrel `index.ts`.

| Interface | Purpose |
|---|---|
| `IVariableProvider` | Implement to expose variables for a namespace |
| `IVariableRegistry` | Injected into the resolver; maps namespaces to providers |
| `IVariableCache` | Swap for a Redis-backed L2 cache without touching other code |
| `IVariableParser` | Contract for the `${...}` parser |
| `IVariableResolver` | Resolves a single expression |
| `IVariableEvaluator` | Top-level evaluate(template, context) call |
| `VariableContext` | Execution context (entityId, entityType, params) |
| `VariableToken` | A parsed `${...}` placeholder |
| `EvaluateOptions` | Evaluate-time flags (fallback, bypassCache) |

---

## Usage (wiring via DI)

```ts
import {
  VariableParser,
  VariableRegistry,
  VariableResolver,
  VariableEvaluator,
  L1VariableCache,
} from '@/modules/variable-engine';

// Wire up (normally done in a DI container / module initialiser):
const cache    = new L1VariableCache({ maxSize: 500 });
const parser   = new VariableParser();
const registry = new VariableRegistry();
const resolver = new VariableResolver(registry, cache);
const engine   = new VariableEvaluator(parser, resolver);

// Register a provider (PR-2+ scope):
registry.register(myCameraProvider);

// Evaluate a template:
const result = await engine.evaluate(
  'Total cameras: ${camera.total}, fiber: ${fiber.length.total} m',
  { entityId: taskId, entityType: 'task' }
);
```

---

## Variable Expression Format

```
${namespace.metric}
${namespace.group.metric}
${count}           ← no-dot, namespace == "count"
```

- Namespace is always the **first dot-separated segment**.
- Whitespace inside `${...}` is trimmed automatically.
- Empty `${}` or whitespace-only `${   }` placeholders are silently ignored.

---

## Soft-fail Policy

- Providers that throw are caught by the resolver; the expression resolves to `undefined`.
- `undefined` / `null` values are replaced with the configured `fallback` string (default `''`).
- A failing provider **never** crashes the rendering of the whole template.

---

## Error Classes

| Class | Thrown by | When |
|---|---|---|
| `VariableEngineError` | — | Base class; never thrown directly |
| `VariableParseError` | (future parsers) | Malformed template |
| `NamespaceConflictError` | `VariableRegistry.register()` | Duplicate namespace in strict mode |
| `VariableResolutionError` | (future strict resolver) | Unresolvable expression in strict mode |

---

## Test Coverage (PR-1)

| Metric | Result |
|---|---|
| Statements | 100 % |
| Branches | 95.52 % |
| Functions | 100 % |
| Lines | 100 % |
| Tests | 70 passing |

---

## PR Roadmap Status

| PR | Title | Status |
|---|---|---|
| **PR-1** | Variable Engine Foundation | ✅ **Done** |
| PR-2 | Provider Contract + Auto Registration | ⏳ Pending |
| PR-3 | Template Integration Adapter | ⏳ Pending |
| PR-4 | Hierarchy Providers | ⏳ Pending |
| PR-5 | CCTV/Network/Fiber Providers | ⏳ Pending |
| PR-6 | Contract/Warehouse/Task/AI Providers | ⏳ Pending |
| PR-7 | Error Policy + Observability | ⏳ Pending |
| PR-8 | Function Registry (MVP) | ⏳ Pending |
| PR-9 | Performance & Stabilization | ⏳ Pending |
| PR-10 | Final Rollout | ⏳ Pending |

---

## Limitations and Possible Errors (PR-1 Scope)

1. **No TTL / L2 cache** – `L1VariableCache` is a simple Map with FIFO eviction.  Long-running processes with high cardinality contexts may need a more sophisticated cache (PR-7/9 scope).
2. **No nested `${...}` expressions** – The parser regex stops at the first `}`, so `${fn(${inner})}` is not supported.  Nested expressions are PR-8 scope.
3. **No function call syntax** – `${round(fiber.length)}` is not yet parsed (PR-8 scope).
4. **No strict-mode resolver** – `VariableResolutionError` is defined but the current resolver always soft-fails.  A strict evaluator mode can be added later.
5. **FIFO eviction is an approximation of LRU** – The Map-based cache evicts the oldest *inserted* key, not the least *recently used* one.  This is acceptable for an L1 cache; a proper LRU is a future optimisation.
6. **Parser edge case: `}` inside expression** – The regex `[^}]*` stops at the first `}`, so expressions containing a literal `}` are truncated.  This is intentional MVP behaviour; escape sequences are out of scope.

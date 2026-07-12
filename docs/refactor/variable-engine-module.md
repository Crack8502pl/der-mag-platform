# Variable Engine – Module Documentation

> **Status:** PR-3 – Template Integration Adapter / BOM path (implemented)  
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

VariableEngineFactory  ← PR-2: DI wiring / auto-registration
  ├── IVariableProvider[]  (injected list; auto-registered on create())
  └── creates VariableEvaluator + VariableRegistry

AbstractVariableProvider  ← PR-2: convenience base class for providers
```

### Component responsibilities

| Component | File | Responsibility |
|---|---|---|
| `VariableParser` | `parser/VariableParser.ts` | Extracts `${expr}` tokens from template strings |
| `VariableRegistry` | `registry/VariableRegistry.ts` | Maps namespace → provider; detects conflicts |
| `L1VariableCache` | `cache/L1VariableCache.ts` | In-process Map-based cache with FIFO eviction |
| `VariableResolver` | `resolver/VariableResolver.ts` | Resolves a single expression via registry + cache |
| `VariableEvaluator` | `evaluator/VariableEvaluator.ts` | Orchestrates parse → resolve → render pipeline |
| `AbstractVariableProvider` | `providers/AbstractVariableProvider.ts` | Base class for domain providers (PR-2) |
| `VariableEngineFactory` | `factory/VariableEngineFactory.ts` | DI-friendly factory; auto-registers providers (PR-2) |
| `LegacyVariableResolver` | `adapter/LegacyVariableResolver.ts` | Simple flat-map `${...}` substitution (PR-3 fallback) |
| `BomTemplateRenderingAdapter` | `adapter/BomTemplateRenderingAdapter.ts` | Connects engine to BOM rendering; feature-flagged (PR-3) |
| `readFeatureFlags` | `config/featureFlags.ts` | Reads `VARIABLE_ENGINE_V2` env var (PR-3) |
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

## DI Auto-Registration (PR-2)

The `VariableEngineFactory` is the recommended DI entry point.  Pass the full
list of `IVariableProvider` instances from your container and call `create()` to
get a fully wired engine:

```ts
import { VariableEngineFactory } from '@/modules/variable-engine';

const factory = new VariableEngineFactory(
  [cameraProvider, fiberProvider, contractProvider],
  { cache: { maxSize: 500 } }
);

const { engine, registry } = factory.create();
// All providers are auto-registered; no manual registry.register() calls.
```

### Writing a new provider (OCP: no core changes required)

```ts
import { AbstractVariableProvider } from '@/modules/variable-engine';
import type { VariableContext, VariableValue } from '@/modules/variable-engine';

export class CameraProvider extends AbstractVariableProvider {
  readonly namespaces = ['camera'] as const;

  async resolve(expression: string, context: VariableContext): Promise<VariableValue> {
    const field = this.extractField(expression); // e.g. "total"
    if (field === 'total') return await this.db.countCameras(context.entityId);
    return undefined;
  }
}
```

Add the provider to the DI container's list – the engine picks it up automatically.

---

## BOM Template Rendering Adapter (PR-3)

The `BomTemplateRenderingAdapter` is the integration point between the Variable Engine and the BOM domain.  It is the **only** public-facing way for BOM code to use the engine; BOM services should not call `IVariableEvaluator.evaluate()` directly.

### Feature flag

| Env var | Values | Effect |
|---|---|---|
| `VARIABLE_ENGINE_V2` | `true` | New engine is used (async, provider-based) |
| `VARIABLE_ENGINE_V2` | anything else / unset | Legacy flat-map resolver is used (default, safe fallback) |

### Usage

```ts
import {
  BomTemplateRenderingAdapter,
  LegacyVariableResolver,
  VariableEngineFactory,
  readFeatureFlags,
} from '@/modules/variable-engine';

// 1. Build the engine with providers (injected via DI in production):
const { engine } = new VariableEngineFactory([ /* …providers… */ ]).create();

// 2. Construct the adapter (once per request or as a singleton):
const adapter = new BomTemplateRenderingAdapter(
  engine,
  new LegacyVariableResolver(),
  readFeatureFlags(),          // reads VARIABLE_ENGINE_V2 from process.env
);

// 3. Render a BOM template string:
const rendered = await adapter.render(
  'Total cameras: ${camera.total}',
  { entityId: taskId, entityType: 'task' },
);
// → New engine path:   'Total cameras: 5'  (provider resolves camera.total)
// → Legacy path:       'Total cameras: ${camera.total}'  (no params → kept as-is)
```

### Legacy path: flat-map resolution

When `variableEngineV2 = false`, the adapter uses `LegacyVariableResolver` with
the values supplied in `context.params`:

```ts
const rendered = await adapter.render(
  'Cameras: ${camera.total}, days: ${retention.days}',
  {
    params: {
      'camera.total': 5,
      'retention.days': 14,
    },
  },
);
// → 'Cameras: 5, days: 14'
```

Unknown placeholders (not present in `params`) are preserved verbatim to prevent
silent data loss.

### Rollback

To roll back to the legacy resolver, set `VARIABLE_ENGINE_V2=false` (or remove
the env var entirely).  No code change is required.

---

## Usage (wiring via DI)

### Using `VariableEngineFactory` (recommended – PR-2)

```ts
import {
  VariableEngineFactory,
  AbstractVariableProvider,
} from '@/modules/variable-engine';
import type { VariableContext, VariableValue } from '@/modules/variable-engine';

// 1. Define a provider (extending the base class is optional but convenient):
class CameraProvider extends AbstractVariableProvider {
  readonly namespaces = ['camera'] as const;
  async resolve(expression: string, _ctx: VariableContext): Promise<VariableValue> {
    if (this.extractField(expression) === 'total') return 42;
    return undefined;
  }
}

// 2. Wire via factory (all providers auto-registered):
const factory = new VariableEngineFactory(
  [new CameraProvider()],
  { cache: { maxSize: 500 } }
);
const { engine } = factory.create();

// 3. Evaluate:
const result = await engine.evaluate('Cameras: ${camera.total}', { entityId: 1 });
// → 'Cameras: 42'
```

### Manual wiring (lower-level, PR-1 style)

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

// Register a provider manually:
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

## Test Coverage (PR-2)

| Metric | Result |
|---|---|
| Statements | 100 % |
| Branches | 96.38 % |
| Functions | 100 % |
| Lines | 100 % |
| Tests (variable-engine suite) | 89 passing (70 PR-1 + 19 PR-2) |

### New test files (PR-2)

| File | Covers |
|---|---|
| `AbstractVariableProvider.test.ts` | Base class contract, `extractField` helper |
| `VariableEngineFactory.test.ts` | Auto-registration, conflict detection, OCP demo, independent instances |

---

## Test Coverage (PR-3)

| Metric | Result |
|---|---|
| Statements | 100 % |
| Branches | 97 % |
| Functions | 100 % |
| Lines | 100 % |
| Tests (variable-engine suite) | 126 passing (89 PR-1/2 + 37 PR-3) |

### New test files (PR-3)

| File | Covers |
|---|---|
| `LegacyVariableResolver.test.ts` | Flat-map substitution, unknown placeholders, edge cases |
| `BomTemplateRenderingAdapter.test.ts` | Flag-based routing, context forwarding, evaluator delegation |
| `featureFlags.test.ts` | Env-var reading, default value, runtime change detection |

---

## PR Roadmap Status

| PR | Title | Status |
|---|---|---|
| **PR-1** | Variable Engine Foundation | ✅ **Done** |
| **PR-2** | Provider Contract + Auto Registration | ✅ **Done** |
| **PR-3** | Template Integration Adapter | ✅ **Done** |
| PR-4 | Hierarchy Providers | ⏳ Pending |
| PR-5 | CCTV/Network/Fiber Providers | ⏳ Pending |
| PR-6 | Contract/Warehouse/Task/AI Providers | ⏳ Pending |
| PR-7 | Error Policy + Observability | ⏳ Pending |
| PR-8 | Function Registry (MVP) | ⏳ Pending |
| PR-9 | Performance & Stabilization | ⏳ Pending |
| PR-10 | Final Rollout | ⏳ Pending |

## Limitations and Possible Errors (PR-1 Scope)

1. **No TTL / L2 cache** – `L1VariableCache` is a simple Map with FIFO eviction.  Long-running processes with high cardinality contexts may need a more sophisticated cache (PR-7/9 scope).
2. **No nested `${...}` expressions** – The parser regex stops at the first `}`, so `${fn(${inner})}` is not supported.  Nested expressions are PR-8 scope.
3. **No function call syntax** – `${round(fiber.length)}` is not yet parsed (PR-8 scope).
4. **No strict-mode resolver** – `VariableResolutionError` is defined but the current resolver always soft-fails.  A strict evaluator mode can be added later.
5. **FIFO eviction is an approximation of LRU** – The Map-based cache evicts the oldest *inserted* key, not the least *recently used* one.  This is acceptable for an L1 cache; a proper LRU is a future optimisation.
6. **Parser edge case: `}` inside expression** – The regex `[^}]*` stops at the first `}`, so expressions containing a literal `}` are truncated.  This is intentional MVP behaviour; escape sequences are out of scope.

## Limitations and Possible Errors (PR-2 Scope)

1. **Registration order matters for `overwrite: true`** – When two providers register the same namespace and `overwrite` is enabled, the *last* provider in the array wins.  Callers must be aware of ordering in the DI container.
2. **No deferred / lazy registration** – All providers are registered synchronously during `VariableEngineFactory.create()`.  Providers that require async initialisation (e.g. fetching a config from a DB) must be initialised before being passed to the factory.
3. **No hot-reload of providers** – The `VariableRegistry` does not support unregistering or replacing a provider at runtime without conflict (unless `overwrite: true`).  Dynamic provider management is out of scope for this PR.
4. **Duplicate key detection is namespace-level only** – Two providers can register overlapping *expressions* (e.g. both handle `camera.total`) as long as they use *different* namespace prefixes (impossible by design) or the same namespace is deduplicated by the registry's single-key-per-namespace model.  In practice a given expression maps to exactly one provider.
5. **No NestJS / IoC container integration** – PR-2 implements the factory/DI pattern for a plain Express app.  Integration with a full IoC container (e.g. `tsyringe`, NestJS) is a future concern; the factory can be wrapped trivially when needed.

## Limitations and Possible Errors (PR-3 Scope)

1. **Legacy resolver uses flat params only** – The `LegacyVariableResolver` resolves variables solely from `context.params`.  Variables that require database or service calls (e.g. `camera.total` resolved by a provider) are NOT available on the legacy path; callers must pre-compute and pass them in `params`.
2. **Null/undefined params are excluded** – If a param value is `null` or `undefined`, the placeholder is preserved verbatim on the legacy path.  This matches legacy behaviour but may cause surprises if callers forget to pass a required variable.
3. **Semantic difference: null vs. empty string** – The new engine returns `''` (empty string) for unresolved variables by default; the legacy path returns the original `${...}` placeholder.  Code consuming rendered output must be tolerant of both forms during the transition period.
4. **Feature flag is read at adapter construction time** – The `FeatureFlags` object is captured in the adapter constructor.  If `VARIABLE_ENGINE_V2` is changed after the adapter is instantiated, the running instance is unaffected.  Restart the process (or construct a new adapter) to pick up the new value.
5. **No BOM-specific provider is wired yet** – PR-3 provides the adapter plumbing only.  The concrete BOM providers (camera counts, fiber lengths, etc.) are PR-4/PR-5/PR-6 scope.  Until those are implemented, the new engine path will return empty strings for BOM-specific expressions.
6. **Engine → BOM dependency constraint** – The engine module must never import BOM entities or services.  The `BomRenderContext` type alias (= `VariableContext`) is intentionally defined inside the adapter to satisfy this constraint.

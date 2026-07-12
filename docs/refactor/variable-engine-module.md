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
| **PR-4** | Hierarchy Providers | ✅ **Done** |
| **PR-5** | CCTV/Network/Fiber Providers | ✅ **Done** |
| **PR-6** | Contract/Warehouse/Task/AI Providers | ✅ **Done** |
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

---

## Test Coverage (PR-4)

| Metric | Result |
|---|---|
| Tests (variable-engine suite) | 158 passing (126 PR-1/2/3 + 32 PR-4) |

### New test files (PR-4)

| File | Covers |
|---|---|
| `TaskRelationshipTraversalService.test.ts` | getParentId (root, parent), getChildrenIds, getDepth (0/1/N), getAncestorPath (chain, cycle detection) |
| `HierarchyVariableProvider.test.ts` | hierarchy.parent/children/depth/path, soft-fail (unknown field, missing entityId, non-numeric), edge cases (entityId=0, no entityType) |

### New files (PR-4)

| File | Purpose |
|---|---|
| `providers/hierarchy/IHierarchyTraversalService.ts` | DI interface – domain-agnostic hierarchy traversal contract |
| `providers/hierarchy/TaskRelationshipTraversalService.ts` | Adapts `TaskRelationshipService` to the traversal interface; adds depth/path + cycle guard |
| `providers/hierarchy/HierarchyVariableProvider.ts` | `hierarchy.*` variable provider (`parent`, `children`, `depth`, `path`) |
| `providers/hierarchy/index.ts` | Barrel export for the hierarchy providers sub-module |

---

## Limitations and Possible Errors (PR-4 Scope)

1. **One primary parent only** – `TaskRelationshipTraversalService.getParentId` returns the *first* parent from `TaskRelationshipService.getParents()`.  If a task has multiple parents (DAG rather than a tree), only the first is used for depth/path calculations.  Multi-parent traversal is out of scope.
2. **N+1 queries per level** – `getDepth` and `getAncestorPath` issue one DB query per hierarchy level.  For a chain of depth N this is N round-trips.  Callers are encouraged to call `getAncestorPath` once and derive depth from its length.  The engine's L1 cache prevents re-querying the same entity within a single evaluation pass.
3. **MAX_DEPTH cap (100)** – Cycle detection uses a `visited` Set.  As a secondary safety net, traversal is also capped at 100 levels.  Legitimate hierarchies deeper than 100 will be truncated silently.
4. **`hierarchy.children` returns a count, not a list** – Because `VariableValue` is a scalar type, the count of direct children is exposed, not the IDs themselves.  A separate `hierarchy.children.count` alias was not added to keep the API surface minimal.
5. **entityType is passed to the traversal service but not used by `TaskRelationshipTraversalService`** – The current implementation ignores `entityType` because `TaskRelationship` entities are task-specific.  Future adapters for other entity types (contracts, warehouses) can honour `entityType` to route to the correct repository.

---

## Test Coverage (PR-5)

| Metric | Result |
|---|---|
| Tests (variable-engine suite) | 233 passing (158 PR-1…4 + 75 PR-5) |

### New test files (PR-5)

| File | Covers |
|---|---|
| `CameraVariableProvider.test.ts` | `camera.*` fields, soft-fail, edge cases |
| `SwitchVariableProvider.test.ts` | `switch.*` fields, soft-fail, edge cases |
| `FiberVariableProvider.test.ts` | `fiber.*` fields, soft-fail, edge cases |
| `IpVariableProvider.test.ts` | `ip.*` fields, soft-fail, edge cases |

### New files (PR-5)

| File | Purpose |
|---|---|
| `providers/camera/ICameraDataService.ts` | DI interface for camera-domain data |
| `providers/camera/CameraVariableProvider.ts` | `camera.*` variable provider |
| `providers/camera/index.ts` | Barrel export |
| `providers/switch/ISwitchDataService.ts` | DI interface for network-switch data |
| `providers/switch/SwitchVariableProvider.ts` | `switch.*` variable provider |
| `providers/switch/index.ts` | Barrel export |
| `providers/fiber/IFiberDataService.ts` | DI interface for fiber-optic data |
| `providers/fiber/FiberVariableProvider.ts` | `fiber.*` variable provider |
| `providers/fiber/index.ts` | Barrel export |
| `providers/ip/IIpDataService.ts` | DI interface for IP-network data |
| `providers/ip/IpVariableProvider.ts` | `ip.*` variable provider |
| `providers/ip/index.ts` | Barrel export |

---

## Limitations and Possible Errors (PR-5 Scope)

1. **No unit conversion** – `fiber.length.total` is returned in kilometres as provided by the data service.  If the domain service stores data in metres, the adapter layer must convert before returning.  The engine itself is unit-agnostic.
2. **No aggregation across subsystems** – Each provider resolves data for a single `entityId`.  Aggregating values across multiple subsystems (e.g. total cameras per contract) requires a data service that performs that aggregation; the variable engine does not compose results from multiple entities.
3. **Missing/partial data is `undefined`** – If a data service returns `undefined` for a subset of fields in the data snapshot, the provider returns `undefined` for those expressions.  This is by design (soft-fail), but callers should handle empty string rendering of those placeholders.

---

## Test Coverage (PR-6)

| Metric | Result |
|---|---|
| Tests (variable-engine suite) | 339 passing (233 PR-1…5 + 106 PR-6) |

### New test files (PR-6)

| File | Covers |
|---|---|
| `ContractVariableProvider.test.ts` | `contract.*` fields, soft-fail, edge cases |
| `WarehouseVariableProvider.test.ts` | `warehouse.*` fields, soft-fail, edge cases |
| `TaskVariableProvider.test.ts` | `task.*` fields, soft-fail, edge cases |
| `AiVariableProvider.test.ts` | `ai.*` fields, soft-fail, edge cases |
| `UserVariableProvider.test.ts` | `user.*` fields, soft-fail, edge cases |

### New files (PR-6)

| File | Purpose |
|---|---|
| `providers/contract/IContractDataService.ts` | DI interface for contract-domain data |
| `providers/contract/ContractVariableProvider.ts` | `contract.*` variable provider |
| `providers/contract/index.ts` | Barrel export |
| `providers/warehouse/IWarehouseDataService.ts` | DI interface for warehouse-domain data |
| `providers/warehouse/WarehouseVariableProvider.ts` | `warehouse.*` variable provider |
| `providers/warehouse/index.ts` | Barrel export |
| `providers/task/ITaskDataService.ts` | DI interface for task-domain data |
| `providers/task/TaskVariableProvider.ts` | `task.*` variable provider |
| `providers/task/index.ts` | Barrel export |
| `providers/ai/IAiDataService.ts` | DI interface for AI-generated insight data |
| `providers/ai/AiVariableProvider.ts` | `ai.*` variable provider |
| `providers/ai/index.ts` | Barrel export |
| `providers/user/IUserDataService.ts` | DI interface for user-domain data |
| `providers/user/UserVariableProvider.ts` | `user.*` variable provider |
| `providers/user/index.ts` | Barrel export |

### Variable namespace reference (PR-6)

| Namespace | Expression | Type | Description |
|---|---|---|---|
| `contract` | `contract.number` | string | Contract number / identifier |
| `contract` | `contract.status` | string | Contract status (e.g. `"active"`, `"closed"`) |
| `contract` | `contract.customer.name` | string | Customer full name |
| `contract` | `contract.customer.nip` | string | Customer tax ID (NIP) |
| `contract` | `contract.value.net` | number | Net contract value |
| `contract` | `contract.value.gross` | number | Gross contract value |
| `contract` | `contract.date.start` | string | Contract start date (ISO 8601) |
| `contract` | `contract.date.end` | string | Contract end date (ISO 8601) |
| `warehouse` | `warehouse.items.total` | number | Total item count |
| `warehouse` | `warehouse.items.reserved` | number | Reserved item count |
| `warehouse` | `warehouse.items.available` | number | Available item count |
| `warehouse` | `warehouse.value.total` | number | Total value of items |
| `warehouse` | `warehouse.location` | string | Warehouse location descriptor |
| `task` | `task.number` | string | Task number / identifier |
| `task` | `task.status` | string | Task status (e.g. `"open"`, `"done"`) |
| `task` | `task.title` | string | Task title |
| `task` | `task.priority` | string | Task priority level |
| `task` | `task.assignee.name` | string | Assignee full name |
| `task` | `task.due.date` | string | Due date (ISO 8601) |
| `task` | `task.progress` | number | Completion progress (0–100) |
| `ai` | `ai.summary` | string | AI-generated entity summary |
| `ai` | `ai.recommendation` | string | AI-generated recommendation |
| `ai` | `ai.risk.level` | string | Risk level label (e.g. `"low"`, `"high"`) |
| `ai` | `ai.risk.score` | number | Numeric risk score (0–100) |
| `user` | `user.name` | string | User full display name |
| `user` | `user.email` | string | User email address |
| `user` | `user.role` | string | User role (e.g. `"admin"`, `"technician"`) |

---

## Limitations and Possible Errors (PR-6 Scope)

1. **No domain coupling** – All five providers operate through injected data-service interfaces (`IContractDataService`, `IWarehouseDataService`, etc.).  Concrete implementations that query actual DB repositories must be written outside the variable-engine module and injected via DI.
2. **Nullability in relational data** – Contract and task entities often have optional related data (e.g. a contract with no assigned customer, a task with no assignee).  Data service implementations must translate database `null` to `undefined` in the snapshot; the providers then return `undefined` and the engine renders an empty string by default.
3. **Status drift** – Business statuses (`contract.status`, `task.status`, `task.priority`) are returned as plain strings from the data service.  If the domain status enum evolves (e.g. new values are added), the variable engine is unaffected; callers rendering templates must be aware of the possible values.
4. **AI data availability** – `ai.*` variables depend on a pre-computed AI analysis.  If the AI service has not processed an entity yet, the data service returns `undefined` and all `ai.*` expressions render as empty strings.  No fallback text is injected automatically.
5. **`user.*` represents a single associated user** – The `user.*` namespace models one user per entity (e.g. the contract creator or primary task assignee).  Multi-user scenarios (e.g. teams) require additional namespaces or dedicated providers.
6. **Warehouse data is entity-scoped** – `warehouse.*` resolves inventory data for a single entity ID.  Cross-entity or aggregated warehouse reports are not supported by this provider; they require a dedicated aggregation service.

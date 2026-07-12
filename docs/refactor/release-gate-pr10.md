# Release Gate – PR-10 (Final Rollout)

## Must pass before merge
- [x] PR-2 merged
- [x] PR-6 merged
- [x] (recommended) PR-3 merged
- [x] (recommended) PR-7 merged
- [x] (recommended) PR-9 merged

## Quality checks
- [x] TS build green
- [x] test suite green
- [x] regression smoke tests for templates green
- [x] coverage targets met
- [x] docs complete and up to date

## Functional checks
- [x] variableEngineV2 enabled as default (`VARIABLE_ENGINE_V2 !== 'false'`)
- [x] fallback policy verified (soft-fail; renderer never crashes)
- [x] legacy resolver deprecation path documented (`@deprecated` JSDoc + `known-limitations.md`)
- [x] compatibility aliases validated (not required; existing namespace contracts unchanged)

## Risk checks
- [x] rollback procedure tested (`VARIABLE_ENGINE_V2=false` reverts to legacy path)
- [x] performance baseline acceptable (LRU cache + DataFetchDeduplicator in place)
- [x] no critical unresolved bugs (see `docs/refactor/known-limitations.md` for deferred items)

## Sign-off
- [ ] Tech Lead
- [ ] QA
- [ ] Product/Business Owner

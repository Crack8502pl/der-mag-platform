# Completion order access policy

Access to a single `CompletionOrder` (`/api/completion/orders/:id/**`) is enforced by `requireCompletionOrderAccess`
(`src/middleware/CompletionOrderAccess.ts`) using `canAccessCompletionOrder` from
`src/services/CompletionOrderAccessService.ts`. The middleware is applied to every route with `:id`
(read, scan, report-missing, pallets, decision, approve, complete, cancel, serials, warehouse location,
partial issue request/approve/reopen, prefab, issued quantities).

- Privileged (access to any order): role with `all: true`, `completion.readAll: true`, or `completion.decideContinue: true` (managers).
- Other users (workers): only orders where `assignedToId` equals their user id.
- Foreign or missing orders return `404 Not Found` (existence is not disclosed).
- List endpoints (`/orders`, `/completed`) are forced to the user's own orders for non-privileged users (`restrictCompletionListScope`).

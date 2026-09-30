# LCS: camera summing and recorder BOM quantity

## Problem (2026-09-30 diagnostics)
- **A – lost crossing cameras:** the BOM resolver API returns `resolvedQuantity` as a decimal string (`"2.00"`) for some items and a number (`1`) for others.
  `Number.isFinite("2.00")` is `false`, so crossing cameras were zeroed and only SKP cameras (2) reached the resolver instead of 10.
- **B – recorder quantity 0:** the selected recorder was stored in config params but never mapped to the BOM item, so all recorder items had quantity `0.00`.

## Fix
- Frontend: `ResolvedBomItem.resolvedQuantity` is `number | string`; it is normalized with `Number()` (`normalizeQuantity`) when mapped to React state and in `materialToCameraBreakdown`. UI text now reads "dobrano dla X kamer".
- Backend: `BomResolverService` maps the selected recorder to BOM items by `warehouseStockId` (DEPENDENT items without `dependsOnItemId`): matching item gets `1`, other recorder alternatives `0`. No name matching. No data migration needed.

## API contract
`resolvedQuantity` on the API boundary is `number | string` (decimal string from DB numeric columns). Clients must normalize with `Number()`.

## Test scenarios
- `"2.00"` parses to 2; 2 crossings (2 general + 2 LPR) + 2 SKP => `{ total: 10, ogolna: 4, lpr: 4, skp: 2 }`.
- Backend: 10 cameras => `WJ-NU300` quantity 1, others 0; 2 cameras => `WJ-NU101` quantity 1, others 0.

# Slican audio deployment plan

This document is an operational plan, not evidence that a deployment occurred.
No staging or production environment was available to this change.

## Phase 1: staging (3–5 days)

1. Deploy the approved PR and apply the schema migration.
2. Apply the seed migration to existing matching warehouse stock. Confirm the
   seeded records are inactive and compare each stock mapping against the
   authoritative Slican catalog.
3. Enter/verify central limits and license SKUs with an administrator; activate
   only reviewed configurations.
4. Run focused unit, endpoint, aggregation-to-resolution and BOM tests. Exercise
   two Przejazd nodes, a Nastawnia, duplicate device IDs, missing packages,
   priority selection and hierarchy edits.
5. Smoke-test `/admin/bom`, the audio resolver and the SMOK-A wizard. Confirm
   camera/reorder flows, SMOKIP_B, CCTV and projects without audio are unchanged.
6. Collect admin/user feedback, attach actual screenshots, log defects and
   deploy fixes. QA, Product Manager and DevOps sign off before canary.

## Phase 2: canary production (1–2 days)

1. Enable for a controlled 5–10% cohort using the application's feature
   controls; do not enable unknown or unverified central/license rows.
2. Monitor resolver and aggregate error rates, response latency, warnings,
   unexpected BOM quantities and support tickets. Compare with pre-release
   camera and recorder metrics.
3. Keep the previous application version deployable and confirm the database
   backup and rollback owner before widening the cohort.
4. Pause expansion and follow the rollback plan if errors, incorrect quantities
   or user-impacting regressions exceed the release team's agreed thresholds.

## Phase 3: full production (0.5–1 day)

1. Expand to 100% after canary acceptance and release-owner approval.
2. Monitor continuously for the first day; keep the support contact available.
3. Verify the admin panel, representative resolver requests, wizard propagation
   and absence of changes to camera/recorder behavior.
4. Record release, migration, monitoring and approval outcomes.

## Owners and measurements

Assign release, database, QA and support owners before scheduling. Monitor
HTTP 4xx/5xx rates, resolver latency, warning counts, central selection and
license/BOM quantity discrepancies. Define numeric alert thresholds with the
service owner before canary; the repository does not provide Slican-specific
production baselines.

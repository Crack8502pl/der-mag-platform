# Slican audio data retention

## Data stored

Central, license and multiplier configuration remains in its configuration
tables until an administrator changes or deletes it. The tables do not define
an audio-specific expiry period or change-history table. Deleting a specification
does not delete its `warehouse_stock` product.

The wizard stores a resolved audio breakdown, recommendation, license selection
and BOM quantities in task metadata. Those records follow the retention and
archiving policy for the parent task/database; this repository does not define a
separate audio retention duration. Confirm the applicable organization policy
before applying a deletion or archival request.

## Archive

Archive the parent project using the existing task archive/backup process.
Preserve its task metadata and resolved BOM together so that historic
recommendations remain interpretable. Do not delete shared central or license
specifications as part of project archival.

## Remove a project's audio data

1. Identify the project and confirm the request with the project owner.
2. Export or back up the task metadata and BOM if retention policy requires it.
3. Remove `slicanAudioItems`, `audioItems`, `audioBreakdown`,
   `slicanAudioCentralRecommendation`, `slicanAudioLicenses` and
   `slicanAudioBomItems` from that project's metadata/configuration only.
4. Remove project-specific BOM rows only through the existing BOM/task deletion
   workflow; do not delete shared `warehouse_stock` rows or global
   `slican_*_specifications`.
5. Verify that the task loads without audio data and that its camera/recorder BOM
   remains intact.

There is no dedicated audio-project deletion endpoint or automated retention
job. Use the supported application workflow or a reviewed database operation
with a backup, transaction and project-specific predicate; do not run a
table-wide DELETE for project cleanup.

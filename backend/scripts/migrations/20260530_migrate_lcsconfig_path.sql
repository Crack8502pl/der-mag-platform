-- Migracja: ujednolicenie ścieżki lcsConfig i nastawniConfig w task.metadata

UPDATE subsystem_tasks
SET metadata = jsonb_set(
  metadata,
  '{lcsConfig}',
  metadata->'configParams'->'lcsConfig',
  true
)
WHERE
  metadata->'configParams'->'lcsConfig' IS NOT NULL
  AND (metadata->'lcsConfig') IS NULL
  AND task_type = 'LCS';

UPDATE subsystem_tasks
SET metadata = jsonb_set(
  metadata,
  '{nastawniConfig}',
  metadata->'configParams'->'nastawniConfig',
  true
)
WHERE
  metadata->'configParams'->'nastawniConfig' IS NOT NULL
  AND (metadata->'nastawniConfig') IS NULL
  AND task_type = 'NASTAWNIA';

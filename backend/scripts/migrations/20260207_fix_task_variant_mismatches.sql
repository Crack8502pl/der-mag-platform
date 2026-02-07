-- Migration: Fix Task Variant Mismatches
-- Date: 2026-02-07
-- Description: Corrects incorrect task_type and taskVariant values for SMOKIP_A and SMOKIP_B tasks
--              that were created with wrong category information (KAT E, F, C instead of KAT A, B)

-- Fix tasks.metadata.taskVariant for SMOKIP_A tasks
UPDATE tasks
SET metadata = jsonb_set(metadata, '{taskVariant}', '"PRZEJAZD_KAT_E"')
WHERE metadata->>'taskVariant' = 'PRZEJAZD_KAT_A'
  AND title LIKE '%KAT E%';

UPDATE tasks
SET metadata = jsonb_set(metadata, '{taskVariant}', '"PRZEJAZD_KAT_F"')
WHERE metadata->>'taskVariant' = 'PRZEJAZD_KAT_A'
  AND title LIKE '%KAT F%';

-- Fix tasks.metadata.taskVariant for SMOKIP_B tasks
UPDATE tasks
SET metadata = jsonb_set(metadata, '{taskVariant}', '"PRZEJAZD_KAT_C"')
WHERE metadata->>'taskVariant' = 'PRZEJAZD_KAT_B'
  AND title LIKE '%KAT C%';

UPDATE tasks
SET metadata = jsonb_set(metadata, '{taskVariant}', '"PRZEJAZD_KAT_E"')
WHERE metadata->>'taskVariant' = 'PRZEJAZD_KAT_B'
  AND title LIKE '%KAT E%';

UPDATE tasks
SET metadata = jsonb_set(metadata, '{taskVariant}', '"PRZEJAZD_KAT_F"')
WHERE metadata->>'taskVariant' = 'PRZEJAZD_KAT_B'
  AND title LIKE '%KAT F%';

-- Fix subsystem_tasks.task_type for SMOKIP_A
UPDATE subsystem_tasks
SET task_type = 'PRZEJAZD_KAT_E'
WHERE task_type = 'PRZEJAZD_KAT_A'
  AND task_name LIKE '%KAT E%';

UPDATE subsystem_tasks
SET task_type = 'PRZEJAZD_KAT_F'
WHERE task_type = 'PRZEJAZD_KAT_A'
  AND task_name LIKE '%KAT F%';

-- Fix subsystem_tasks.task_type for SMOKIP_B
UPDATE subsystem_tasks
SET task_type = 'PRZEJAZD_KAT_C'
WHERE task_type = 'PRZEJAZD_KAT_B'
  AND task_name LIKE '%KAT C%';

UPDATE subsystem_tasks
SET task_type = 'PRZEJAZD_KAT_E'
WHERE task_type = 'PRZEJAZD_KAT_B'
  AND task_name LIKE '%KAT E%';

UPDATE subsystem_tasks
SET task_type = 'PRZEJAZD_KAT_F'
WHERE task_type = 'PRZEJAZD_KAT_B'
  AND task_name LIKE '%KAT F%';

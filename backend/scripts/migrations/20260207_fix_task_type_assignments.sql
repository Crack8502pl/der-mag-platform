-- Migration: Fix task_type_id assignments for tasks created by wizard
-- Created: 2026-02-07
-- Description: Tasks created via contract wizard had task_type_id = 1 (SMW default)
--              because the lookup was done by task variant code instead of subsystem type code.
--              This migration fixes existing tasks by looking at their subsystem's system_type.

BEGIN;

-- Fix tasks that have subsystem_id set - use the subsystem's system_type to find correct task_type
UPDATE tasks t
SET task_type_id = tt.id
FROM subsystems s
JOIN task_types tt ON tt.code = s.system_type
WHERE t.subsystem_id = s.id
  AND t.task_type_id = 1  -- Only fix tasks with default SMW type
  AND s.system_type != 'SMW'  -- Don't touch tasks that are actually SMW
  AND tt.active = true;

-- Also fix tasks based on metadata.subsystemType if subsystem_id is not set
UPDATE tasks t
SET task_type_id = tt.id
FROM task_types tt
WHERE t.metadata->>'subsystemType' IS NOT NULL
  AND tt.code = t.metadata->>'subsystemType'
  AND t.task_type_id = 1
  AND t.metadata->>'subsystemType' != 'SMW'
  AND tt.active = true;

-- Log how many tasks were fixed
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM tasks t
  JOIN subsystems s ON t.subsystem_id = s.id
  JOIN task_types tt ON tt.code = s.system_type AND tt.active = true
  WHERE t.task_type_id = tt.id AND s.system_type != 'SMW';
  
  RAISE NOTICE 'Migration completed: task_type_id assignments fixed for tasks with subsystem reference';
END $$;

COMMIT;

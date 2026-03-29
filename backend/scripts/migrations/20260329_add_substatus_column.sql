-- Migration: Add substatus column to subsystem_tasks
-- Date: 2026-03-29
-- Description: Adds substatus column to track shipment request state (e.g. wysyłka_zlecona)

ALTER TABLE subsystem_tasks 
ADD COLUMN IF NOT EXISTS substatus VARCHAR(50) DEFAULT NULL;

-- Create index for substatus queries
CREATE INDEX IF NOT EXISTS idx_subsystem_tasks_substatus ON subsystem_tasks(substatus);

-- Add comment
COMMENT ON COLUMN subsystem_tasks.substatus IS 'Substatus zadania: wysyłka_zlecona, w_realizacji, zakonczone';

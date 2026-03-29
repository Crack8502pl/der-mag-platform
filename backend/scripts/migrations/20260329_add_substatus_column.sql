-- Add substatus column to subsystem_tasks table
ALTER TABLE subsystem_tasks 
ADD COLUMN IF NOT EXISTS substatus VARCHAR(50) DEFAULT NULL;

-- Create index for substatus queries
CREATE INDEX IF NOT EXISTS idx_subsystem_tasks_substatus ON subsystem_tasks(substatus);

-- Add comment
COMMENT ON COLUMN subsystem_tasks.substatus IS 'Substatus zadania: wysyłka_zlecona, w_realizacji, zakonczone';

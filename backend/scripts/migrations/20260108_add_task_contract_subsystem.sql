-- Migration: Add contract_id and subsystem_id to tasks table
-- Date: 2026-01-08
-- Purpose: Link tasks to contracts and subsystems for wizard-created tasks

-- Add contract_id column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS contract_id INTEGER;

-- Add subsystem_id column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS subsystem_id INTEGER;

-- Add foreign key constraints
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_contract 
FOREIGN KEY (contract_id) 
REFERENCES contracts(id) 
ON DELETE SET NULL;

ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_subsystem 
FOREIGN KEY (subsystem_id) 
REFERENCES subsystems(id) 
ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_contract ON tasks(contract_id);
CREATE INDEX IF NOT EXISTS idx_tasks_subsystem ON tasks(subsystem_id);

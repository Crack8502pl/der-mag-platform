-- Migration: Add realization tracking columns to subsystem_tasks
-- Date: 2026-01-12
-- Description: Add realization_started_at and realization_completed_at columns for tracking task realization lifecycle

-- Add realization tracking columns
ALTER TABLE subsystem_tasks 
ADD COLUMN IF NOT EXISTS realization_started_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS realization_completed_at TIMESTAMP NULL;

-- Add comments for documentation
COMMENT ON COLUMN subsystem_tasks.realization_started_at IS 'Timestamp when task realization started';
COMMENT ON COLUMN subsystem_tasks.realization_completed_at IS 'Timestamp when task realization was completed';

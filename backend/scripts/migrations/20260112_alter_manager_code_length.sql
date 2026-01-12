-- Migration: Alter manager_code column length in contracts table
-- Date: 2026-01-12
-- Description: Change manager_code from VARCHAR(3) to VARCHAR(5) to support longer manager codes

-- Alter manager_code column to allow up to 5 characters
ALTER TABLE contracts 
ALTER COLUMN manager_code TYPE VARCHAR(5);

-- Add comment for documentation
COMMENT ON COLUMN contracts.manager_code IS 'Manager code - up to 5 characters (e.g., ABC12)';

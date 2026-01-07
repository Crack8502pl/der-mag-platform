-- Migration: Add employee_code field to users table
-- Date: 2026-01-07
-- Description: Adds a 3-character employee code field to the users table

-- Add employee_code column
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code VARCHAR(3);

-- Create unique index on employee_code (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_code 
ON users(employee_code) 
WHERE employee_code IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN users.employee_code IS 'Trzyliterowy kod pracownika generowany z inicjałów (np. RKR dla Remigiusz Krakowski)';

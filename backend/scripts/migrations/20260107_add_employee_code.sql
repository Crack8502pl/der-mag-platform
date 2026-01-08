-- Migration: Add employee_code field to users table
-- Date: 2026-01-07
-- Updated: 2026-01-08 - Extended to 5 characters
-- Description: Adds a 3-5 character employee code field to the users table

-- Add employee_code column
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code VARCHAR(5);

-- Create unique index on employee_code (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_code 
ON users(employee_code) 
WHERE employee_code IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN users.employee_code IS 'Kod pracownika (3-5 znaków) generowany z inicjałów (np. RKR dla Remigiusz Krakowski)';

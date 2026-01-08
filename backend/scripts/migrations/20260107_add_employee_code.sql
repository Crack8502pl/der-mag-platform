-- Migration: Add employee_code field to users table
-- Date: 2026-01-07
-- Description: Adds a 3-5 character employee code field to the users table

-- Add employee_code column or alter if exists
DO $$ 
BEGIN
  -- Try to add column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'employee_code') THEN
    ALTER TABLE users ADD COLUMN employee_code VARCHAR(5);
  ELSE
    -- If column exists but with wrong length, alter it
    ALTER TABLE users ALTER COLUMN employee_code TYPE VARCHAR(5);
  END IF;
END $$;

-- Create unique index on employee_code (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_code 
ON users(employee_code) 
WHERE employee_code IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN users.employee_code IS 'Kod pracownika 3-5 znaków generowany z inicjałów (np. RKR, ROKR, REMKR)';

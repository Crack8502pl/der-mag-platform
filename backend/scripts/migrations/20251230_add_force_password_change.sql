-- Migration: Add force_password_change and password_changed_at columns to users table
-- Date: 2025-12-30
-- Description: Adds columns for managing one-time password changes and password change tracking

BEGIN;

-- Add force_password_change column with default TRUE
-- New users will be required to change their password on first login
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT TRUE;

-- Add password_changed_at column to track when password was last changed
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP NULL;

-- Set password_changed_at to current time for existing users who already have passwords
-- This ensures existing users won't be forced to change password unless explicitly set
UPDATE users 
SET password_changed_at = NOW(), 
    force_password_change = FALSE 
WHERE password IS NOT NULL 
  AND password_changed_at IS NULL;

-- Add comment to columns for documentation
COMMENT ON COLUMN users.force_password_change IS 'Forces user to change password on next login';
COMMENT ON COLUMN users.password_changed_at IS 'Timestamp of last password change';

COMMIT;

-- Verification query (optional, for manual testing)
-- SELECT id, username, force_password_change, password_changed_at FROM users;

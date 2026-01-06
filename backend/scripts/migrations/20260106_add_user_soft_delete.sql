-- Migration: Add deleted_at column for soft delete support
-- Date: 2026-01-06
-- Description: Adds soft delete functionality to users table

-- Add deleted_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;
        COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user was soft deleted. NULL means active.';
    END IF;
END $$;

-- Create index on deleted_at for faster queries
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- Update unique constraints to allow deleted users to have duplicate emails/usernames
-- This is handled at application level - deleted users (deleted_at IS NOT NULL) are excluded from uniqueness checks

COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp. When set, user is considered deleted and excluded from uniqueness checks.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: deleted_at column added to users table';
END $$;

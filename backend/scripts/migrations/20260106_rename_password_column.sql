-- Migration: Rename password column to password_hash
-- Date: 2026-01-06
-- Description: Renames the 'password' column to 'password_hash' in the users table
--              to follow security best practices (passwords are always stored as hashes)

-- Rename password column to password_hash (if needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'password'
  ) THEN
    ALTER TABLE users RENAME COLUMN password TO password_hash;
    RAISE NOTICE 'Column users.password renamed to users.password_hash';
  ELSE
    RAISE NOTICE 'Column users.password_hash already exists, skipping rename';
  END IF;
END $$;

-- Add comment to column
COMMENT ON COLUMN users.password_hash IS 'Hashed user password (bcrypt)';

-- Verification query (uncomment to run)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash';

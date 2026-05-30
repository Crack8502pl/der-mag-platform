-- Migration: Add session IP/UA tracking fields for change detection
-- Created: 2026-05-30
-- Description: Adds last_ip_address and last_user_agent to user_sessions_log
--              to track changes during token rotation cycles

ALTER TABLE user_sessions_log
  ADD COLUMN IF NOT EXISTS last_ip_address VARCHAR(45) NULL,
  ADD COLUMN IF NOT EXISTS last_user_agent TEXT NULL;

-- Populate existing rows with login-time values as baseline
UPDATE user_sessions_log
SET last_ip_address = ip_address,
    last_user_agent = user_agent
WHERE last_ip_address IS NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_sessions_log_last_ip ON user_sessions_log(last_ip_address);

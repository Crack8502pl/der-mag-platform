-- Migration: Add user_sessions_log table for session duration tracking
CREATE TABLE IF NOT EXISTS user_sessions_log (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id        UUID NOT NULL,
  login_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  logout_at       TIMESTAMP NULL,
  duration_seconds INTEGER NULL,
  ip_address      VARCHAR(45) NULL,
  user_agent      TEXT NULL,
  logout_type     VARCHAR(20) NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_log_user_id ON user_sessions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_log_token_id ON user_sessions_log(token_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_log_login_at ON user_sessions_log(login_at);

COMMENT ON TABLE user_sessions_log IS 'Tracks user login sessions with duration for admin monitoring';
COMMENT ON COLUMN user_sessions_log.logout_type IS 'manual | admin_forced | token_expired | token_reuse';

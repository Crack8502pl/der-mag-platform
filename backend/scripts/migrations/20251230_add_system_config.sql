-- Migration: Add system_config table and otp_expires_at column
-- Date: 2025-12-30
-- Description: Adds system configuration table for SMTP/portal settings and OTP expiration tracking

BEGIN;

-- Create system_config table
CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  is_encrypted BOOLEAN DEFAULT FALSE,
  category VARCHAR(50),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by_id INTEGER REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

-- Add comments for documentation
COMMENT ON TABLE system_config IS 'System configuration settings (SMTP, portal URL, etc.)';
COMMENT ON COLUMN system_config.key IS 'Configuration key (e.g., smtp_host, portal_url)';
COMMENT ON COLUMN system_config.value IS 'Configuration value (encrypted if is_encrypted=true)';
COMMENT ON COLUMN system_config.is_encrypted IS 'Whether the value is encrypted (true for passwords)';
COMMENT ON COLUMN system_config.category IS 'Configuration category (smtp, portal, security, etc.)';

-- Insert default values
INSERT INTO system_config (key, value, category, is_encrypted) VALUES
('portal_url', 'http://localhost:3001', 'portal', false),
('smtp_host', '', 'smtp', false),
('smtp_port', '587', 'smtp', false),
('smtp_user', '', 'smtp', false),
('smtp_password', '', 'smtp', true),
('smtp_secure', 'false', 'smtp', false),
('smtp_from_name', 'Der-Mag Platform', 'smtp', false),
('smtp_from_email', 'noreply@dermag.pl', 'smtp', false)
ON CONFLICT (key) DO NOTHING;

-- Add otp_expires_at column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP NULL;

-- Add comment to column for documentation
COMMENT ON COLUMN users.otp_expires_at IS 'Expiration timestamp for one-time password (OTP)';

COMMIT;

-- Verification query (optional, for manual testing)
-- SELECT * FROM system_config ORDER BY category, key;
-- SELECT id, username, otp_expires_at, force_password_change FROM users;

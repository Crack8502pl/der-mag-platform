-- backend/scripts/migrations/20260403_create_wizard_drafts.sql
-- Tabela do przechowywania draftów wizardów (kreator kontraktów, kreator wysyłki, itp.)

CREATE TABLE IF NOT EXISTS wizard_drafts (
  id SERIAL PRIMARY KEY,
  wizard_type VARCHAR(50) NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL,
  current_step INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  CONSTRAINT unique_user_wizard UNIQUE(wizard_type, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wizard_drafts_user_type ON wizard_drafts(user_id, wizard_type);
CREATE INDEX IF NOT EXISTS idx_wizard_drafts_expires ON wizard_drafts(expires_at);

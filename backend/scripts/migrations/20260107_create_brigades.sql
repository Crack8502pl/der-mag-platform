-- Migration: Create brigades and brigade_members tables
-- Date: 2026-01-07
-- Description: Creates tables for brigade management system

-- Create brigades table
CREATE TABLE IF NOT EXISTS brigades (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on code for fast lookups
CREATE INDEX IF NOT EXISTS idx_brigades_code ON brigades(code);
CREATE INDEX IF NOT EXISTS idx_brigades_active ON brigades(active);

-- Create brigade_members table
CREATE TABLE IF NOT EXISTS brigade_members (
  id SERIAL PRIMARY KEY,
  brigade_id INTEGER NOT NULL REFERENCES brigades(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_days JSONB DEFAULT '[]',
  valid_from DATE NOT NULL,
  valid_to DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(brigade_id, user_id, valid_from)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_brigade_members_brigade ON brigade_members(brigade_id);
CREATE INDEX IF NOT EXISTS idx_brigade_members_user ON brigade_members(user_id);
CREATE INDEX IF NOT EXISTS idx_brigade_members_dates ON brigade_members(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_brigade_members_active ON brigade_members(active);

-- Add comments
COMMENT ON TABLE brigades IS 'Brygady serwisowe z przypisanymi pojazdami';
COMMENT ON COLUMN brigades.code IS 'Numer rejestracyjny samochodu (np. WA12345)';
COMMENT ON TABLE brigade_members IS 'Przypisanie pracowników do brygad z harmonogramem';
COMMENT ON COLUMN brigade_members.work_days IS 'Dni tygodnia pracy: 1=Pon, 2=Wt, 3=Śr, 4=Czw, 5=Pt, 6=Sob, 7=Niedz';

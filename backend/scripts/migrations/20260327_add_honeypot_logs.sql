-- Migration: 20260327_add_honeypot_logs.sql
-- Dodanie tabeli honeypot_logs do przechowywania logów prób skanowania

-- Typ ENUM dla poziomów zagrożeń
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'threat_level_enum') THEN
    CREATE TYPE threat_level_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  END IF;
END$$;

-- Tabela logów honeypota
CREATE TABLE IF NOT EXISTS honeypot_logs (
  id              SERIAL PRIMARY KEY,
  ip              VARCHAR(45) NOT NULL,
  user_agent      TEXT,
  method          VARCHAR(10) NOT NULL,
  path            TEXT NOT NULL,
  headers         JSONB,
  detected_scanner VARCHAR(50),
  honeypot_type   VARCHAR(50),
  query_params    TEXT,
  request_body    TEXT,
  threat_level    threat_level_enum NOT NULL DEFAULT 'LOW',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed        BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT
);

-- Indeksy dla szybkiego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_honeypot_logs_ip ON honeypot_logs(ip);
CREATE INDEX IF NOT EXISTS idx_honeypot_logs_detected_scanner ON honeypot_logs(detected_scanner);
CREATE INDEX IF NOT EXISTS idx_honeypot_logs_created_at ON honeypot_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_honeypot_logs_threat_level ON honeypot_logs(threat_level);

-- Funkcja czyszczenia starych logów
CREATE OR REPLACE FUNCTION cleanup_old_honeypot_logs(older_than_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM honeypot_logs
  WHERE created_at < NOW() - (older_than_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
